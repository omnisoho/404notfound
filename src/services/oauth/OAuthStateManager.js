const crypto = require("crypto");

/**
 * OAuth State Manager
 * 
 * Handles OAuth state tokens for CSRF protection.
 * Follows Single Responsibility Principle: Only responsible for state token management.
 * 
 * State tokens prevent CSRF attacks by ensuring that OAuth callbacks
 * are only processed if they match a state token we generated.
 */
class OAuthStateManager {
  /**
   * Creates a new OAuthStateManager instance
   * @param {Object} options - Configuration options
   * @param {number} [options.stateLength=32] - Length of state token in bytes
   * @param {number} [options.maxAge=600000] - Maximum age of state token in milliseconds (default: 10 minutes)
   */
  constructor(options = {}) {
    this.stateLength = options.stateLength || 32; // 32 bytes = 64 hex characters
    this.maxAge = options.maxAge || 600000; // 10 minutes default
  }

  /**
   * Generates a cryptographically secure state token
   * @returns {string} Hex-encoded state token
   */
  generateState() {
    return crypto.randomBytes(this.stateLength).toString("hex");
  }

  /**
   * Validates a state token against a stored state
   * Uses constant-time comparison to prevent timing attacks
   * @param {string} receivedState - State token received from OAuth callback
   * @param {string} storedState - State token stored in cookie/session
   * @returns {boolean} True if states match
   */
  validateState(receivedState, storedState) {
    if (!receivedState || !storedState) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(receivedState, "hex"),
      Buffer.from(storedState, "hex")
    );
  }

  /**
   * Stores state token in a cookie (signed if cookie secret is configured)
   * @param {Object} res - Express response object
   * @param {string} state - State token to store
   * @param {string} provider - OAuth provider name (for cookie name)
   * @param {string} [cookieSecret] - Optional cookie secret for signing (from process.env.COOKIE_SECRET)
   */
  storeStateInCookie(res, state, provider, cookieSecret = null) {
    const cookieName = this._getStateCookieName(provider);
    const secret = cookieSecret || process.env.COOKIE_SECRET;
    
    const cookieOptions = {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      maxAge: this.maxAge, // Token expires after maxAge
      path: "/", // Available for all paths
    };

    // Use signed cookies if secret is available (more secure)
    if (secret) {
      cookieOptions.signed = true;
    }

    res.cookie(cookieName, state, cookieOptions);
  }

  /**
   * Retrieves state token from signed cookie (or unsigned if no secret configured)
   * @param {Object} req - Express request object
   * @param {string} provider - OAuth provider name
   * @returns {string|null} Stored state token or null if not found
   */
  getStoredState(req, provider) {
    const cookieName = this._getStateCookieName(provider);
    
    // Try signed cookies first (more secure, requires cookie-parser with secret)
    if (req.signedCookies && req.signedCookies[cookieName]) {
      return req.signedCookies[cookieName];
    }

    // Fallback to unsigned cookies (if cookie-parser secret not configured)
    if (req.cookies && req.cookies[cookieName]) {
      return req.cookies[cookieName];
    }

    return null;
  }

  /**
   * Clears the state token cookie
   * @param {Object} res - Express response object
   * @param {string} provider - OAuth provider name
   * @param {string} [cookieSecret] - Optional cookie secret (must match if cookie was signed)
   */
  clearStateCookie(res, provider, cookieSecret = null) {
    const cookieName = this._getStateCookieName(provider);
    const secret = cookieSecret || process.env.COOKIE_SECRET;
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };

    // Include signed option if secret was used
    if (secret) {
      cookieOptions.signed = true;
    }

    res.clearCookie(cookieName, cookieOptions);
  }

  /**
   * Validates state and clears cookie if valid
   * Convenience method that combines validation and cleanup
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} receivedState - State token from OAuth callback
   * @param {string} provider - OAuth provider name
   * @returns {boolean} True if state is valid
   */
  validateAndClear(req, res, receivedState, provider) {
    const storedState = this.getStoredState(req, provider);
    const isValid = this.validateState(receivedState, storedState);

    // Always clear the cookie after validation attempt (whether valid or not)
    // This prevents reuse of state tokens
    if (storedState) {
      this.clearStateCookie(res, provider);
    }

    return isValid;
  }

  /**
   * Gets the cookie name for a specific provider's state
   * @param {string} provider - OAuth provider name
   * @returns {string} Cookie name
   * @private
   */
  _getStateCookieName(provider) {
    return `oauth_state_${provider.toLowerCase()}`;
  }
}

module.exports = OAuthStateManager;

