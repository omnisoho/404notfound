const OAuthProviderFactory = require("./OAuthProviderFactory");
const OAuthStateManager = require("./OAuthStateManager");
const { getOAuthConfig, getRedirectUri, validateOAuthConfig } = require("../../config/oauth.config");
const {
  findUserByProvider,
  createOAuthUser,
  linkOAuthProvider,
  updateOAuthProvider,
} = require("../../models/User.model");
const prisma = require("../../models/prismaClient");
const {
  OAuthStateMismatchError,
  AccountLinkingRequiredError,
  OAuthConfigError,
} = require("./OAuthErrors");

/**
 * OAuth Service
 * 
 * Orchestrates the OAuth authentication flow and account linking.
 * Follows Single Responsibility Principle: Only responsible for OAuth orchestration.
 * Follows Dependency Inversion Principle: Depends on abstractions (OAuthProvider interface).
 * 
 * This service handles:
 * - Initiating OAuth flows
 * - Processing OAuth callbacks
 * - Finding or creating users
 * - Account linking logic
 */
class OAuthService {
  /**
   * Creates a new OAuthService instance
   * @param {OAuthStateManager} stateManager - State manager instance (optional, creates default if not provided)
   */
  constructor(stateManager = null) {
    this.stateManager = stateManager || new OAuthStateManager();
  }

  /**
   * Initiates OAuth flow by generating authorization URL
   * @param {string} provider - OAuth provider name ('google' or 'facebook')
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {string} Authorization URL to redirect user to
   * @throws {Error} If provider is invalid or configuration is missing
   */
  initiateOAuth(provider, req, res) {
    // Validate provider configuration
    validateOAuthConfig(provider);

    // Get OAuth configuration
    const config = getOAuthConfig();
    const redirectUri = getRedirectUri(provider);

    // Create provider instance
    const oauthProvider = OAuthProviderFactory.createProvider(provider, config);

    // Generate state token for CSRF protection
    const state = this.stateManager.generateState();

    // Store state in cookie
    this.stateManager.storeStateInCookie(res, state, provider);

    // Get authorization URL
    const authorizationUrl = oauthProvider.getAuthorizationUrl(state, redirectUri);

    return authorizationUrl;
  }

  /**
   * Gets OAuth user information from callback without creating/finding user
   * Useful for account linking flows
   * @param {string} provider - OAuth provider name ('google' or 'facebook')
   * @param {string} code - Authorization code from OAuth callback
   * @param {string} state - State token from OAuth callback
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<OAuthUserInfo>} OAuth user information
   * @throws {Error} If state validation fails, token exchange fails, or user info retrieval fails
   */
  async getOAuthUserInfo(provider, code, state, req, res) {
    // Validate provider configuration
    try {
      validateOAuthConfig(provider);
    } catch (error) {
      throw new OAuthConfigError(
        `OAuth configuration error for ${provider}: ${error.message}`,
        provider
      );
    }

    // Validate state token (CSRF protection)
    const isValidState = this.stateManager.validateAndClear(req, res, state, provider);
    if (!isValidState) {
      throw new OAuthStateMismatchError("Invalid or expired state token. Please try again.");
    }

    // Get OAuth configuration
    const config = getOAuthConfig();
    const redirectUri = getRedirectUri(provider);

    // Create provider instance
    const oauthProvider = OAuthProviderFactory.createProvider(provider, config);

    // Exchange authorization code for access token
    const tokenResponse = await oauthProvider.exchangeCodeForToken(code, redirectUri);

    // Get user information from OAuth provider
    const oauthUserInfo = await oauthProvider.getUserInfo(tokenResponse.access_token);

    return oauthUserInfo;
  }

  /**
   * Handles OAuth callback and completes authentication flow
   * @param {string} provider - OAuth provider name ('google' or 'facebook')
   * @param {string} code - Authorization code from OAuth callback
   * @param {string} state - State token from OAuth callback
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Result object with user, token, and accountLinkingRequired flag
   * @throws {Error} If state validation fails, token exchange fails, or user creation fails
   */
  async handleCallback(provider, code, state, req, res) {
    // Validate provider configuration
    try {
      validateOAuthConfig(provider);
    } catch (error) {
      throw new OAuthConfigError(
        `OAuth configuration error for ${provider}: ${error.message}`,
        provider
      );
    }

    // Validate state token (CSRF protection)
    const isValidState = this.stateManager.validateAndClear(req, res, state, provider);
    if (!isValidState) {
      throw new OAuthStateMismatchError("Invalid or expired state token. Please try again.");
    }

    // Get OAuth configuration
    const config = getOAuthConfig();
    const redirectUri = getRedirectUri(provider);

    // Create provider instance
    const oauthProvider = OAuthProviderFactory.createProvider(provider, config);

    // Exchange authorization code for access token
    const tokenResponse = await oauthProvider.exchangeCodeForToken(code, redirectUri);

    // Get user information from OAuth provider
    const oauthUserInfo = await oauthProvider.getUserInfo(tokenResponse.access_token);

    // Find or create user and handle account linking
    const result = await this.findOrCreateUser(oauthUserInfo, provider);

    return result;
  }

  /**
   * Finds existing user or creates new user from OAuth information
   * Handles account linking logic
   * @param {OAuthUserInfo} oauthUserInfo - User information from OAuth provider
   * @param {string} provider - OAuth provider name
   * @returns {Promise<Object>} Result object with user, accountLinkingRequired flag
   * @private
   */
  async findOrCreateUser(oauthUserInfo, provider) {
    const normalizedProvider = provider.toLowerCase().trim();

    // First, try to find user by OAuth provider ID
    const userByProvider = await this._findUserByProvider(
      oauthUserInfo.providerId,
      normalizedProvider
    );

    if (userByProvider) {
      // User exists with this OAuth provider - return existing user
      return {
        user: userByProvider,
        accountLinkingRequired: false,
      };
    }

    // User doesn't exist with this OAuth provider
    // Check if user exists with this email
    const userByEmail = await this._findUserByEmail(oauthUserInfo.email);

    if (userByEmail) {
      // User exists with this email but different auth method
      if (userByEmail.authProvider === "email") {
        // Email/password account exists - account linking required
        return {
          user: null,
          accountLinkingRequired: true,
          existingUserEmail: userByEmail.email,
          existingUserName: userByEmail.name,
        };
      } else {
        // User exists with different OAuth provider - update provider info
        const updatedUser = await this._updateOAuthProvider(
          userByEmail.id,
          oauthUserInfo,
          normalizedProvider
        );
        return {
          user: updatedUser,
          accountLinkingRequired: false,
        };
      }
    }

    // New user - create OAuth user with timezone and currency
    const newUser = await this._createOAuthUser(
      oauthUserInfo,
      normalizedProvider,
      req
    );

    return {
      user: newUser,
      accountLinkingRequired: false,
    };
  }

  /**
   * Links OAuth account to existing email/password account
   * @param {string} userId - ID of existing user account
   * @param {OAuthUserInfo} oauthUserInfo - User information from OAuth provider
   * @param {string} provider - OAuth provider name
   * @returns {Promise<Object>} Updated user object
   * @throws {Error} If user not found or linking fails
   */
  async linkAccount(userId, oauthUserInfo, provider) {
    // Verify user exists and check if already linked
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        authProvider: true,
        providerId: true,
      },
    });

    if (!existingUser) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const normalizedProvider = provider.toLowerCase().trim();

    // Check if user already has this OAuth provider linked
    if (
      existingUser.authProvider === normalizedProvider &&
      existingUser.providerId === oauthUserInfo.providerId
    ) {
      // Already linked - return user without updating
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          userRole: true,
          authProvider: true,
          profilePictureUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    }

    // Link OAuth provider to existing account
    return await linkOAuthProvider(userId, oauthUserInfo, provider);
  }

  /**
   * Finds user by OAuth provider ID
   * @param {string} providerId - OAuth provider's user ID
   * @param {string} provider - OAuth provider name
   * @returns {Promise<Object|null>} User object or null if not found
   * @private
   */
  async _findUserByProvider(providerId, provider) {
    return await findUserByProvider(providerId, provider);
  }

  /**
   * Finds user by email
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} User object or null if not found
   * @private
   */
  async _findUserByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        authProvider: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Creates a new user from OAuth information
   * @param {OAuthUserInfo} oauthUserInfo - User information from OAuth provider
   * @param {string} provider - OAuth provider name
   * @param {Object} req - Express request object (for accessing cookies/timezone)
   * @returns {Promise<Object>} Created user object
   * @private
   */
  async _createOAuthUser(oauthUserInfo, provider, req = null) {
    return await createOAuthUser(oauthUserInfo, provider, req);
  }

  /**
   * Updates user's OAuth provider information
   * @param {string} userId - User ID
   * @param {OAuthUserInfo} oauthUserInfo - User information from OAuth provider
   * @param {string} provider - OAuth provider name
   * @returns {Promise<Object>} Updated user object
   * @private
   */
  async _updateOAuthProvider(userId, oauthUserInfo, provider) {
    return await updateOAuthProvider(userId, oauthUserInfo, provider);
  }

  /**
   * Formats user object for response (removes sensitive fields)
   * @param {Object} user - User object from database
   * @returns {Object} Formatted user object
   * @private
   */
  _formatUserResponse(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      userRole: user.userRole,
      authProvider: user.authProvider,
      profilePictureUrl: user.profilePictureUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

module.exports = OAuthService;

