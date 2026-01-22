/**
 * OAuth Provider Interface (Abstract Class)
 *
 * Defines the contract that all OAuth provider implementations must follow.
 * This follows the Dependency Inversion Principle - high-level modules depend
 * on this abstraction rather than concrete implementations.
 *
 * All OAuth providers (Google, Facebook, etc.) must implement these methods.
 *
 * @abstract
 */
class OAuthProvider {
  /**
   * Gets the authorization URL for initiating OAuth flow
   * @param {string} state - CSRF protection state token
   * @param {string} redirectUri - Callback URL after authorization
   * @returns {string} Complete authorization URL
   * @abstract
   */
  getAuthorizationUrl(state, redirectUri) {
    throw new Error(
      "getAuthorizationUrl() must be implemented by OAuth provider"
    );
  }

  /**
   * Exchanges authorization code for access token
   * @param {string} code - Authorization code from OAuth callback
   * @param {string} redirectUri - Callback URL (must match authorization request)
   * @returns {Promise<Object>} Token response with access_token and optional refresh_token
   * @abstract
   */
  async exchangeCodeForToken(code, redirectUri) {
    throw new Error(
      "exchangeCodeForToken() must be implemented by OAuth provider"
    );
  }

  /**
   * Retrieves user information from OAuth provider using access token
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<OAuthUserInfo>} Standardized user information
   * @abstract
   */
  async getUserInfo(accessToken) {
    throw new Error("getUserInfo() must be implemented by OAuth provider");
  }

  /**
   * Validates an access token with the OAuth provider
   * @param {string} accessToken - OAuth access token to validate
   * @returns {Promise<boolean>} True if token is valid
   * @abstract
   */
  async validateToken(accessToken) {
    throw new Error("validateToken() must be implemented by OAuth provider");
  }

  /**
   * Gets the provider name (e.g., 'google', 'facebook')
   * @returns {string} Provider identifier
   * @abstract
   */
  getProviderName() {
    throw new Error("getProviderName() must be implemented by OAuth provider");
  }
}

module.exports = OAuthProvider;
