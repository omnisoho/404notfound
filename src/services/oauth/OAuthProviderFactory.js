const GoogleOAuthProvider = require("./providers/GoogleOAuthProvider");
const FacebookOAuthProvider = require("./providers/FacebookOAuthProvider");
const {
  OAuthProviderNotSupportedError,
  OAuthConfigError,
} = require("./OAuthErrors");

/**
 * OAuth Provider Factory
 *
 * Creates OAuth provider instances based on provider name.
 * Follows Factory Pattern and Dependency Inversion Principle.
 *
 * This allows easy extension to new providers without modifying existing code
 * (Open/Closed Principle).
 */
class OAuthProviderFactory {
  /**
   * Creates an OAuth provider instance
   * @param {string} providerName - Name of the provider ('google' or 'facebook')
   * @param {Object} config - OAuth configuration object
   * @returns {OAuthProvider} Provider instance implementing OAuthProvider interface
   * @throws {Error} If provider name is invalid or configuration is missing
   */
  static createProvider(providerName, config) {
    const normalizedName = providerName.toLowerCase().trim();

    switch (normalizedName) {
      case "google":
        return this._createGoogleProvider(config);
      case "facebook":
        return this._createFacebookProvider(config);
      default:
        throw new OAuthProviderNotSupportedError(providerName);
    }
  }

  /**
   * Creates a Google OAuth provider instance
   * @param {Object} config - Google OAuth configuration
   * @returns {GoogleOAuthProvider} Google provider instance
   * @private
   */
  static _createGoogleProvider(config) {
    if (!config.google) {
      throw new OAuthConfigError(
        "Google OAuth configuration is missing. Expected config.google object.",
        "google"
      );
    }

    const { clientId, clientSecret, scope } = config.google;

    if (!clientId || !clientSecret) {
      throw new OAuthConfigError(
        "Google OAuth requires clientId and clientSecret in config.google",
        "google"
      );
    }

    return new GoogleOAuthProvider({
      clientId,
      clientSecret,
      scope: scope || "email profile",
    });
  }

  /**
   * Creates a Facebook OAuth provider instance
   * @param {Object} config - Facebook OAuth configuration
   * @returns {FacebookOAuthProvider} Facebook provider instance
   * @private
   */
  static _createFacebookProvider(config) {
    if (!config.facebook) {
      throw new OAuthConfigError(
        "Facebook OAuth configuration is missing. Expected config.facebook object.",
        "facebook"
      );
    }

    const { appId, appSecret, scope } = config.facebook;

    if (!appId || !appSecret) {
      throw new OAuthConfigError(
        "Facebook OAuth requires appId and appSecret in config.facebook",
        "facebook"
      );
    }

    return new FacebookOAuthProvider({
      appId,
      appSecret,
      scope: scope || "email public_profile",
    });
  }

  /**
   * Gets list of supported provider names
   * @returns {string[]} Array of supported provider names
   */
  static getSupportedProviders() {
    return ["google", "facebook"];
  }

  /**
   * Checks if a provider is supported
   * @param {string} providerName - Name of the provider to check
   * @returns {boolean} True if provider is supported
   */
  static isProviderSupported(providerName) {
    return this.getSupportedProviders().includes(
      providerName.toLowerCase().trim()
    );
  }
}

module.exports = OAuthProviderFactory;
