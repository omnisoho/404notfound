const https = require("https");
const { URL } = require("url");
const OAuthProvider = require("../OAuthProvider.interface");
const OAuthUserInfo = require("../OAuthUserInfo");
const {
  OAuthCodeExchangeError,
  OAuthUserInfoError,
} = require("../OAuthErrors");

/**
 * Facebook OAuth 2.0 Provider Implementation
 *
 * Implements OAuthProvider interface for Facebook authentication.
 * Follows Single Responsibility Principle: Only handles Facebook-specific OAuth logic.
 *
 * @extends OAuthProvider
 */
class FacebookOAuthProvider extends OAuthProvider {
  /**
   * Creates a new FacebookOAuthProvider instance
   * @param {Object} config - Facebook OAuth configuration
   * @param {string} config.appId - Facebook App ID
   * @param {string} config.appSecret - Facebook App Secret
   * @param {string} [config.scope] - OAuth scopes (default: email public_profile)
   */
  constructor({ appId, appSecret, scope = "email public_profile" }) {
    super();

    if (!appId || !appSecret) {
      throw new Error("FacebookOAuthProvider requires appId and appSecret");
    }

    this.appId = appId;
    this.appSecret = appSecret;
    this.scope = scope;
    this.authorizationEndpoint = "https://www.facebook.com/v18.0/dialog/oauth";
    this.tokenEndpoint = "https://graph.facebook.com/v18.0/oauth/access_token";
    this.userInfoEndpoint = "https://graph.facebook.com/v18.0/me";
    this.debugTokenEndpoint = "https://graph.facebook.com/v18.0/debug_token";
  }

  /**
   * Gets the provider name
   * @returns {string} Provider identifier
   */
  getProviderName() {
    return "facebook";
  }

  /**
   * Gets the authorization URL for initiating Facebook OAuth flow
   * @param {string} state - CSRF protection state token
   * @param {string} redirectUri - Callback URL after authorization
   * @returns {string} Complete Facebook authorization URL
   */
  getAuthorizationUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.scope,
      state: state,
    });

    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for Facebook access token
   * @param {string} code - Authorization code from Facebook OAuth callback
   * @param {string} redirectUri - Callback URL (must match authorization request)
   * @returns {Promise<Object>} Token response with access_token and optional refresh_token
   */
  async exchangeCodeForToken(code, redirectUri) {
    const tokenData = new URLSearchParams({
      code: code,
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
    });

    try {
      const url = new URL(this.tokenEndpoint);
      url.searchParams.set("code", code);
      url.searchParams.set("client_id", this.appId);
      url.searchParams.set("client_secret", this.appSecret);
      url.searchParams.set("redirect_uri", redirectUri);

      const response = await this._makeRequest(url.toString(), "GET");

      if (response.error) {
        throw new OAuthCodeExchangeError(
          `Facebook token exchange failed: ${
            response.error.message || JSON.stringify(response.error)
          }`,
          "facebook",
          error
        );
      }

      return {
        access_token: response.access_token,
        expires_in: response.expires_in,
        token_type: response.token_type || "Bearer",
      };
    } catch (error) {
      // If it's already an OAuth error, re-throw it
      if (error instanceof OAuthCodeExchangeError) {
        throw error;
      }
      throw new OAuthCodeExchangeError(
        `Failed to exchange Facebook authorization code: ${error.message}`,
        "facebook",
        error
      );
    }
  }

  /**
   * Retrieves user information from Facebook using access token
   * @param {string} accessToken - Facebook OAuth access token
   * @returns {Promise<OAuthUserInfo>} Standardized user information
   */
  async getUserInfo(accessToken) {
    try {
      // Facebook Graph API requires fields parameter
      const url = new URL(this.userInfoEndpoint);
      url.searchParams.set(
        "fields",
        "id,name,email,picture.width(200).height(200)"
      );
      url.searchParams.set("access_token", accessToken);

      const response = await this._makeRequest(url.toString(), "GET");

      if (response.error) {
        throw new OAuthUserInfoError(
          `Facebook user info request failed: ${
            response.error.message || JSON.stringify(response.error)
          }`,
          "facebook",
          error
        );
      }

      // Extract picture URL from Facebook's nested structure
      let pictureUrl = null;
      if (
        response.picture &&
        response.picture.data &&
        response.picture.data.url
      ) {
        pictureUrl = response.picture.data.url;
      }

      // Map Facebook user response to OAuthUserInfo
      return new OAuthUserInfo({
        providerId: response.id,
        email: response.email || `${response.id}@facebook.oauth`, // Facebook may not return email
        name: response.name || "Facebook User",
        picture: pictureUrl,
      });
    } catch (error) {
      // If it's already an OAuth error, re-throw it
      if (error instanceof OAuthUserInfoError) {
        throw error;
      }
      throw new OAuthUserInfoError(
        `Failed to get Facebook user info: ${error.message}`,
        "facebook",
        error
      );
    }
  }

  /**
   * Validates a Facebook access token
   * @param {string} accessToken - Facebook OAuth access token to validate
   * @returns {Promise<boolean>} True if token is valid
   */
  async validateToken(accessToken) {
    try {
      const url = new URL(this.debugTokenEndpoint);
      url.searchParams.set("input_token", accessToken);
      url.searchParams.set("access_token", `${this.appId}|${this.appSecret}`);

      const response = await this._makeRequest(url.toString(), "GET");

      // Check if token is valid
      if (response.data && response.data.is_valid === true) {
        return true;
      }

      return false;
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
        options.headers["Content-Type"] = "application/x-www-form-urlencoded";
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
                  `HTTP ${res.statusCode}: ${
                    parsed.error?.message || parsed.error || responseData
                  }`
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

module.exports = FacebookOAuthProvider;
