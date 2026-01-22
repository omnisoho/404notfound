/**
 * OAuth Error Classes
 * 
 * Custom error classes for OAuth-related errors.
 * Follows Single Responsibility Principle: Each error class represents a specific OAuth error type.
 * 
 * All OAuth errors extend Error and include statusCode for HTTP responses.
 */

/**
 * Base class for all OAuth-related errors
 * @extends Error
 */
class OAuthProviderError extends Error {
  /**
   * Creates a new OAuthProviderError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} provider - OAuth provider name (optional)
   * @param {Error} originalError - Original error that caused this error (optional)
   */
  constructor(message, statusCode = 500, provider = null, originalError = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.provider = provider;
    this.originalError = originalError;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when OAuth authorization code exchange fails
 * @extends OAuthProviderError
 */
class OAuthCodeExchangeError extends OAuthProviderError {
  /**
   * Creates a new OAuthCodeExchangeError
   * @param {string} message - Error message
   * @param {string} provider - OAuth provider name
   * @param {Error} originalError - Original error that caused this error (optional)
   */
  constructor(message, provider, originalError = null) {
    super(
      message || `Failed to exchange authorization code for access token with ${provider}`,
      400,
      provider,
      originalError
    );
  }
}

/**
 * Error thrown when fetching user information from OAuth provider fails
 * @extends OAuthProviderError
 */
class OAuthUserInfoError extends OAuthProviderError {
  /**
   * Creates a new OAuthUserInfoError
   * @param {string} message - Error message
   * @param {string} provider - OAuth provider name
   * @param {Error} originalError - Original error that caused this error (optional)
   */
  constructor(message, provider, originalError = null) {
    super(
      message || `Failed to fetch user information from ${provider}`,
      400,
      provider,
      originalError
    );
  }
}

/**
 * Error thrown when OAuth state token validation fails (CSRF protection)
 * @extends OAuthProviderError
 */
class OAuthStateMismatchError extends OAuthProviderError {
  /**
   * Creates a new OAuthStateMismatchError
   * @param {string} message - Error message
   */
  constructor(message = "Invalid or expired state token. Please try again.") {
    super(message, 400);
  }
}

/**
 * Error thrown when account linking is required
 * This is not really an error, but a special case that needs to be handled
 * @extends OAuthProviderError
 */
class AccountLinkingRequiredError extends OAuthProviderError {
  /**
   * Creates a new AccountLinkingRequiredError
   * @param {string} existingUserEmail - Email of the existing user account
   * @param {string} existingUserName - Name of the existing user account (optional)
   */
  constructor(existingUserEmail, existingUserName = null) {
    super(
      "An account with this email already exists. Please link your accounts.",
      409 // Conflict status code
    );
    this.existingUserEmail = existingUserEmail;
    this.existingUserName = existingUserName;
  }
}

/**
 * Error thrown when OAuth provider configuration is invalid or missing
 * @extends OAuthProviderError
 */
class OAuthConfigError extends OAuthProviderError {
  /**
   * Creates a new OAuthConfigError
   * @param {string} message - Error message
   * @param {string} provider - OAuth provider name (optional)
   */
  constructor(message, provider = null) {
    super(
      message || "OAuth configuration is invalid or missing",
      500,
      provider
    );
  }
}

/**
 * Error thrown when OAuth provider is not supported
 * @extends OAuthProviderError
 */
class OAuthProviderNotSupportedError extends OAuthProviderError {
  /**
   * Creates a new OAuthProviderNotSupportedError
   * @param {string} provider - OAuth provider name
   */
  constructor(provider) {
    super(
      `OAuth provider '${provider}' is not supported`,
      400,
      provider
    );
  }
}

/**
 * Error thrown when OAuth token validation fails
 * @extends OAuthProviderError
 */
class OAuthTokenValidationError extends OAuthProviderError {
  /**
   * Creates a new OAuthTokenValidationError
   * @param {string} message - Error message
   * @param {string} provider - OAuth provider name
   * @param {Error} originalError - Original error that caused this error (optional)
   */
  constructor(message, provider, originalError = null) {
    super(
      message || `Failed to validate token with ${provider}`,
      400,
      provider,
      originalError
    );
  }
}

module.exports = {
  OAuthProviderError,
  OAuthCodeExchangeError,
  OAuthUserInfoError,
  OAuthStateMismatchError,
  AccountLinkingRequiredError,
  OAuthConfigError,
  OAuthProviderNotSupportedError,
  OAuthTokenValidationError,
};

