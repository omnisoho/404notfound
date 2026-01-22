/**
 * Validation Utility
 *
 * Centralized validation logic following Single Responsibility Principle
 * Each function validates one specific type of input
 */

const { ValidationError } = require("./errorHandler");

/**
 * Email validator
 */
const EmailValidator = {
  /**
   * Validates email format using RFC 5322 compliant regex
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   * @throws {AppError} If email is invalid
   */
  validate(email) {
    if (!email || typeof email !== "string") {
      throw ValidationError.invalidEmail();
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      throw ValidationError.invalidEmail();
    }

    return true;
  },

  /**
   * Sanitizes email by trimming and lowercasing
   * @param {string} email - Email to sanitize
   * @returns {string} Sanitized email
   */
  sanitize(email) {
    if (!email || typeof email !== "string") {
      return "";
    }
    return email.trim().toLowerCase();
  },
};

/**
 * String validator
 */
const StringValidator = {
  /**
   * Validates and sanitizes a string field
   * @param {any} value - Value to validate
   * @returns {string|null} Sanitized string or null if invalid
   */
  sanitize(value) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },

  /**
   * Checks if a string is non-empty after trimming
   * @param {any} value - Value to check
   * @returns {boolean} True if non-empty string
   */
  isNonEmpty(value) {
    return typeof value === "string" && value.trim().length > 0;
  },
};

/**
 * Measurement system validator
 */
const MeasurementSystemValidator = {
  VALID_SYSTEMS: ["metric", "imperial"],

  /**
   * Validates measurement system
   * @param {string} system - System to validate
   * @returns {string} Validated system
   * @throws {AppError} If system is invalid
   */
  validate(system) {
    if (!system || typeof system !== "string") {
      throw ValidationError.invalidMeasurementSystem();
    }

    const normalized = system.trim().toLowerCase();
    if (!this.VALID_SYSTEMS.includes(normalized)) {
      throw ValidationError.invalidMeasurementSystem();
    }

    return normalized;
  },
};

/**
 * Boolean validator
 */
const BooleanValidator = {
  /**
   * Checks if value is a valid boolean
   * @param {any} value - Value to check
   * @returns {boolean} True if valid boolean
   */
  isValid(value) {
    return typeof value === "boolean";
  },
};

/**
 * Object builder utility
 * Helps build update objects with only valid fields
 */
const ObjectBuilder = {
  /**
   * Adds a string field to an object if valid
   * @param {Object} obj - Object to update
   * @param {string} key - Key to add
   * @param {any} value - Value to validate and add
   */
  addStringField(obj, key, value) {
    const sanitized = StringValidator.sanitize(value);
    if (sanitized !== null) {
      obj[key] = sanitized;
    }
  },

  /**
   * Adds a boolean field to an object if valid
   * @param {Object} obj - Object to update
   * @param {string} key - Key to add
   * @param {any} value - Value to validate and add
   */
  addBooleanField(obj, key, value) {
    if (BooleanValidator.isValid(value)) {
      obj[key] = value;
    }
  },

  /**
   * Ensures object has at least one field
   * @param {Object} obj - Object to check
   * @param {string} errorMessage - Error message if empty
   * @throws {AppError} If object is empty
   */
  ensureNotEmpty(obj, errorMessage = "fields") {
    if (Object.keys(obj).length === 0) {
      throw ValidationError.noFieldsToUpdate(errorMessage);
    }
  },
};

module.exports = {
  EmailValidator,
  StringValidator,
  MeasurementSystemValidator,
  BooleanValidator,
  ObjectBuilder,
};
