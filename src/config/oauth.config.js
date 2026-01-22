/**
 * OAuth Configuration
 *
 * Centralizes OAuth provider configuration from environment variables.
 * Follows Single Responsibility Principle: Only responsible for OAuth configuration.
 *
 * Environment Variables Required:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - FACEBOOK_APP_ID
 * - FACEBOOK_APP_SECRET
 * - OAUTH_REDIRECT_BASE_URL (e.g., http://localhost:3000 or https://yourdomain.com)
 */

/**
 * Gets OAuth configuration from environment variables
 * @returns {Object} OAuth configuration object
 * @throws {Error} If required environment variables are missing
 */
function getOAuthConfig() {
  const redirectBaseUrl =
    process.env.OAUTH_REDIRECT_BASE_URL || "http://localhost:3000";

  const config = {
    redirectBaseUrl,
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scope: process.env.GOOGLE_SCOPE || "email profile",
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      scope: process.env.FACEBOOK_SCOPE || "email public_profile",
    },
  };

  return config;
}

/**
 * Validates that required OAuth configuration is present
 * @param {string} provider - Provider name ('google' or 'facebook')
 * @returns {boolean} True if configuration is valid
 * @throws {Error} If required configuration is missing
 */
function validateOAuthConfig(provider) {
  const config = getOAuthConfig();
  const normalizedProvider = provider.toLowerCase().trim();

  if (normalizedProvider === "google") {
    if (!config.google.clientId || !config.google.clientSecret) {
      throw new Error(
        "Google OAuth configuration is incomplete. " +
          "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
      );
    }
    return true;
  }

  if (normalizedProvider === "facebook") {
    if (!config.facebook.appId || !config.facebook.appSecret) {
      throw new Error(
        "Facebook OAuth configuration is incomplete. " +
          "Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables."
      );
    }
    return true;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Gets the redirect URI for a specific provider
 * @param {string} provider - Provider name ('google' or 'facebook')
 * @returns {string} Complete redirect URI for OAuth callback
 */
function getRedirectUri(provider) {
  const config = getOAuthConfig();
  const normalizedProvider = provider.toLowerCase().trim();
  return `${config.redirectBaseUrl}/auth/${normalizedProvider}/callback`;
}

module.exports = {
  getOAuthConfig,
  validateOAuthConfig,
  getRedirectUri,
};
