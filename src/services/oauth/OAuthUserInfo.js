/**
 * OAuth User Information Data Transfer Object (DTO)
 * 
 * Standardizes user information retrieved from OAuth providers.
 * This ensures consistent data structure regardless of the OAuth provider used.
 * 
 * Follows Single Responsibility Principle: Only responsible for data transfer structure
 */
class OAuthUserInfo {
  /**
   * Creates a new OAuthUserInfo instance
   * @param {Object} data - User information from OAuth provider
   * @param {string} data.providerId - Unique identifier from the OAuth provider
   * @param {string} data.email - User's email address
   * @param {string} data.name - User's full name
   * @param {string} [data.picture] - Optional profile picture URL
   */
  constructor({ providerId, email, name, picture = null }) {
    if (!providerId || !email || !name) {
      throw new Error(
        "OAuthUserInfo requires providerId, email, and name"
      );
    }

    this.providerId = providerId;
    this.email = email.toLowerCase().trim(); // Normalize email
    this.name = name.trim();
    // Validate and normalize picture URL if provided
    this.picture = picture ? this._normalizePictureUrl(picture) : null;
  }

  /**
   * Normalizes and validates picture URL
   * @param {string} url - Picture URL from OAuth provider
   * @returns {string|null} Normalized URL or null if invalid
   * @private
   */
  _normalizePictureUrl(url) {
    if (!url || typeof url !== "string") {
      return null;
    }

    const trimmedUrl = url.trim();
    
    // Basic URL validation (must start with http:// or https://)
    if (
      trimmedUrl.length > 0 &&
      (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://"))
    ) {
      return trimmedUrl;
    }

    // If it's not a valid URL format, return null
    return null;
  }

  /**
   * Validates that all required fields are present
   * @returns {boolean} True if valid
   */
  isValid() {
    return (
      this.providerId &&
      this.email &&
      this.name &&
      this.email.includes("@")
    );
  }

  /**
   * Checks if a profile picture is available
   * @returns {boolean} True if picture URL is present and valid
   */
  hasPicture() {
    return this.picture !== null && this.picture.length > 0;
  }

  /**
   * Converts the DTO to a plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      providerId: this.providerId,
      email: this.email,
      name: this.name,
      picture: this.picture,
    };
  }

  /**
   * Creates an OAuthUserInfo instance from a plain object
   * @param {Object} obj - Plain object with user info
   * @returns {OAuthUserInfo} New OAuthUserInfo instance
   */
  static fromObject(obj) {
    return new OAuthUserInfo(obj);
  }
}

module.exports = OAuthUserInfo;

