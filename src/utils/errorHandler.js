/**
 * Error Handler Utility
 *
 * Centralized error handling following SOLID principles:
 * - Single Responsibility: Each function handles one specific error type
 * - Open/Closed: Easy to extend with new error types without modifying existing code
 * - Liskov Substitution: All error creators return consistent error objects
 * - Interface Segregation: Specific functions for specific error scenarios
 * - Dependency Inversion: High-level code depends on abstractions (this module)
 */

/**
 * Base custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Creates a standardized error object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string|null} code - Optional error code
 * @returns {AppError} Standardized error object
 */
function createError(message, statusCode, code = null) {
  return new AppError(message, statusCode, code);
}

/**
 * Error factory for validation errors (400)
 */
const ValidationError = {
  invalidEmail: () => createError("Invalid email format", 400, "INVALID_EMAIL"),
  invalidPassword: () => createError("Password does not meet requirements", 400, "INVALID_PASSWORD"),
  invalidMeasurementSystem: () => createError("Measurement system must be 'metric' or 'imperial'", 400, "INVALID_MEASUREMENT_SYSTEM"),
  noFieldsToUpdate: (fieldType = "fields") => createError(`No valid ${fieldType} to update`, 400, "NO_FIELDS_TO_UPDATE"),
  missingRequiredField: (field) => createError(`Missing required field: ${field}`, 400, "MISSING_FIELD"),
  invalidInput: (message) => createError(message, 400, "INVALID_INPUT"),
};

/**
 * Error factory for authentication errors (401)
 */
const AuthenticationError = {
  invalidCredentials: () => createError("Invalid email or password", 401, "INVALID_CREDENTIALS"),
  incorrectPassword: () => createError("Current password is incorrect", 401, "INCORRECT_PASSWORD"),
  unauthorized: () => createError("Unauthorized access", 401, "UNAUTHORIZED"),
};

/**
 * Error factory for authorization errors (403)
 */
const AuthorizationError = {
  oauthEmailChange: (provider) => createError(
    `Email cannot be changed for ${provider} accounts. Your email is managed by your OAuth provider.`,
    403,
    "OAUTH_EMAIL_CHANGE_FORBIDDEN"
  ),
  forbidden: (message) => createError(message, 403, "FORBIDDEN"),
};

/**
 * Error factory for not found errors (404)
 */
const NotFoundError = {
  user: () => createError("User not found", 404, "USER_NOT_FOUND"),
  resource: (resourceName) => createError(`${resourceName} not found`, 404, "RESOURCE_NOT_FOUND"),
};

/**
 * Error factory for conflict errors (409)
 */
const ConflictError = {
  emailExists: () => createError("Email already exists", 409, "EMAIL_EXISTS"),
  resourceExists: (resourceName) => createError(`${resourceName} already exists`, 409, "RESOURCE_EXISTS"),
};

/**
 * Error factory for internal server errors (500)
 */
const InternalError = {
  database: (message = "Database error occurred") => createError(message, 500, "DATABASE_ERROR"),
  unexpected: (message = "An unexpected error occurred") => createError(message, 500, "INTERNAL_ERROR"),
};

/**
 * Prisma error handler - Maps Prisma error codes to application errors
 * @param {Error} error - Prisma error object
 * @param {Object} context - Additional context about the operation
 * @returns {AppError} Mapped application error
 */
function handlePrismaError(error, context = {}) {
  const { operation = "database operation", entity = "record" } = context;

  // Prisma error codes reference: https://www.prisma.io/docs/reference/api-reference/error-reference
  switch (error.code) {
    // Unique constraint violation
    case "P2002": {
      const field = error.meta?.target?.[0] || "field";
      if (field === "email") {
        return ConflictError.emailExists();
      }
      return ConflictError.resourceExists(field);
    }

    // Record not found
    case "P2025":
      return NotFoundError.resource(entity);

    // Foreign key constraint violation
    case "P2003":
      return createError(
        `Cannot ${operation} because it would violate a reference constraint`,
        400,
        "FOREIGN_KEY_CONSTRAINT"
      );

    // Record required but not found
    case "P2018":
      return NotFoundError.resource(entity);

    // Null constraint violation
    case "P2011":
      return ValidationError.missingRequiredField(error.meta?.column || "field");

    // Invalid value for field type
    case "P2006":
    case "P2007":
      return ValidationError.invalidInput(`Invalid value provided for ${operation}`);

    // Table does not exist (migration issue)
    case "P2021":
      return InternalError.database("Database schema is not initialized. Please run migrations.");

    // Database timeout
    case "P2024":
      return InternalError.database("Database operation timed out. Please try again.");

    // Transaction failed
    case "P2034":
      return InternalError.database("Transaction failed. Please try again.");

    default:
      // Log unexpected Prisma errors for debugging
      console.error(`Unhandled Prisma error [${error.code}]:`, error.message);
      return InternalError.database(`Database error during ${operation}`);
  }
}

/**
 * Safe error wrapper for async operations
 * Catches errors and ensures they're properly formatted
 * @param {Function} fn - Async function to wrap
 * @param {Object} context - Error context
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      // If already an AppError, rethrow
      if (error instanceof AppError) {
        throw error;
      }

      // Handle Prisma errors
      if (error.code && error.code.startsWith("P")) {
        throw handlePrismaError(error, context);
      }

      // Handle other errors
      console.error("Unexpected error:", error);
      throw InternalError.unexpected(error.message || "An unexpected error occurred");
    }
  };
}

module.exports = {
  AppError,
  createError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InternalError,
  handlePrismaError,
  withErrorHandling,
};
