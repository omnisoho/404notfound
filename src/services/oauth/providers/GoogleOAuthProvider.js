const https = require("https");
const { URL } = require("url");
const OAuthProvider = require("../OAuthProvider.interface");
const OAuthUserInfo = require("../OAuthUserInfo");
const {
  OAuthCodeExchangeError,
  OAuthUserInfoError,
} = require("../OAuthErrors");

/**
 * Google OAuth 2.0 Provider Implementation
 *
 * Implements OAuthProvider interface for Google authentication.
 * Follows Single Responsibility Principle: Only handles Google-specific OAuth logic.
 *
 * @extends OAuthProvider
 */
class GoogleOAuthProvider extends OAuthProvider {
  /**
   * Creates a new GoogleOAuthProvider instance
   * @param {Object} config - Google OAuth configuration
   * @param {string} config.clientId - Google OAuth client ID
   * @param {string} config.clientSecret - Google OAuth client secret
   * @param {string} [config.scope] - OAuth scopes (default: email profile)
   */
  constructor({ clientId, clientSecret, scope = "email profile" }) {
    super();

    if (!clientId || !clientSecret) {
      throw new Error("GoogleOAuthProvider requires clientId and clientSecret");
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.scope = scope;
    this.authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    this.tokenEndpoint = "https://oauth2.googleapis.com/token";
    this.userInfoEndpoint = "https://www.googleapis.com/oauth2/v2/userinfo";
    this.tokenInfoEndpoint = "https://www.googleapis.com/oauth2/v1/tokeninfo";
  }

  /**
   * Gets the provider name
   * @returns {string} Provider identifier
   */
  getProviderName() {
    return "google";
  }

  /**
   * Gets the authorization URL for initiating Google OAuth flow
   * @param {string} state - CSRF protection state token
   * @param {string} redirectUri - Callback URL after authorization
   * @returns {string} Complete Google authorization URL
   */
  getAuthorizationUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.scope,
      state: state,
      access_type: "online",
      prompt: "consent",
    });

    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for Google access token
   * @param {string} code - Authorization code from Google OAuth callback
   * @param {string} redirectUri - Callback URL (must match authorization request)
   * @returns {Promise<Object>} Token response with access_token and optional refresh_token
   */
  async exchangeCodeForToken(code, redirectUri) {
    const tokenData = new URLSearchParams({
      code: code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    try {
      const response = await this._makeRequest(
        this.tokenEndpoint,
        "POST",
        tokenData.toString(),
        {
          "Content-Type": "application/x-www-form-urlencoded",
        }
      );

      if (response.error) {
        throw new OAuthCodeExchangeError(
          `Google token exchange failed: ${
            response.error_description || response.error
          }`,
          "google",
          error
        );
      }

      return {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_in: response.expires_in,
        token_type: response.token_type || "Bearer",
      };
    } catch (error) {
      // If it's already an OAuth error, re-throw it
      if (error instanceof OAuthCodeExchangeError) {
        throw error;
      }
      throw new OAuthCodeExchangeError(
        `Failed to exchange Google authorization code: ${error.message}`,
        "google",
        error
      );
    }
  }

  /**
   * Retrieves user information from Google using access token
   * @param {string} accessToken - Google OAuth access token
   * @returns {Promise<OAuthUserInfo>} Standardized user information
   */
  async getUserInfo(accessToken) {
    try {
      const response = await this._makeRequest(
        this.userInfoEndpoint,
        "GET",
        null,
        {
          Authorization: `Bearer ${accessToken}`,
        }
      );

      if (response.error) {
        throw new OAuthUserInfoError(
          `Google user info request failed: ${
            response.error_description || response.error
          }`,
          "google",
          error
        );
      }

      // Map Google user response to OAuthUserInfo
      return new OAuthUserInfo({
        providerId: response.id,
        email: response.email,
        name:
          response.name ||
          `${response.given_name || ""} ${response.family_name || ""}`.trim() ||
          response.email,
        picture: response.picture || null,
      });
    } catch (error) {
      // If it's already an OAuth error, re-throw it
      if (error instanceof OAuthUserInfoError) {
        throw error;
      }
      throw new OAuthUserInfoError(
        `Failed to get Google user info: ${error.message}`,
        "google",
        error
      );
    }
  }

  /**
   * Validates a Google access token
   * @param {string} accessToken - Google OAuth access token to validate
   * @returns {Promise<boolean>} True if token is valid
   */
  async validateToken(accessToken) {
    try {
      const url = new URL(this.tokenInfoEndpoint);
      url.searchParams.set("access_token", accessToken);

      const response = await this._makeRequest(url.toString(), "GET");

      // If no error and has user_id, token is valid
      return !response.error && !!response.user_id;
    } catch (error) {
      return false;
    }
  }

  /**
   * Makes an HTTP/HTTPS request
   * @param {string} url - Request URL
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string|null} data - Request body data (for POST requests)
   * @param {Object} headers - Additional HTTP headers
   * @returns {Promise<Object>} Parsed JSON response
   * @private
   */
  _makeRequest(url, method = "GET", data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          ...headers,
        },
      };

      if (data && method === "POST") {
        options.headers["Content-Length"] = Buffer.byteLength(data);
      }

      const req = https.request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseData);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(
                new Error(
                  `HTTP ${res.statusCode}: ${parsed.error || responseData}`
                )
              );
            }
          } catch (error) {
            reject(
              new Error(
                `Failed to parse response: ${error.message}. Response: ${responseData}`
              )
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      if (data && method === "POST") {
        req.write(data);
      }

      req.end();
    });
  }
}

module.exports = GoogleOAuthProvider;
