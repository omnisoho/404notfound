const prisma = require("./prismaClient");
const argon2 = require("argon2");
const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  handlePrismaError,
  withErrorHandling,
} = require("../utils/errorHandler");
const {
  EmailValidator,
  StringValidator,
  MeasurementSystemValidator,
  ObjectBuilder,
} = require("../utils/validators");

/**
 * User repository - Handles all user data operations
 * Follows SOLID principles with centralized error handling
 */

/**
 * Registers a new user in the system
 * @param {string} name - User's full name
 * @param {string} email - User's email address (must be unique)
 * @param {string} password - Plain text password to be hashed
 * @returns {Promise<Object>} User object without password hash
 * @throws {AppError} If email already exists or validation fails
 */
module.exports.registerUser = withErrorHandling(
  async function registerUser(name, email, password) {
    // Validate email format
    EmailValidator.validate(email);

    // Hash the password using argon2
    const passwordHash = await argon2.hash(password);

    // Create the user in the database
    const user = await prisma.user.create({
      data: {
        name,
        email: EmailValidator.sanitize(email),
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },
  { operation: "user registration", entity: "user" }
);

/**
 * Authenticates a user by verifying email and password
 * @param {string} email - User's email address
 * @param {string} password - Plain text password to verify
 * @returns {Promise<Object>} User object without password hash
 * @throws {AppError} If credentials are invalid
 */
module.exports.loginUser = withErrorHandling(
  async function loginUser(email, password) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: EmailValidator.sanitize(email) },
    });

    // If user doesn't exist, throw error
    if (!user) {
      throw AuthenticationError.invalidCredentials();
    }

    // Verify password using argon2
    const isValidPassword = await argon2.verify(user.passwordHash, password);

    // If password is invalid, throw error
    if (!isValidPassword) {
      throw AuthenticationError.invalidCredentials();
    }

    // Return user data without password hash
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      userRole: user.userRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
  { operation: "user login", entity: "user" }
);

/**
 * Retrieves user settings by user ID
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object|null>} User settings object or null if not found
 */
module.exports.getUserSettings = async function getUserSettings(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        authProvider: true,
        providerId: true,
        providerEmail: true,
        profilePictureUrl: true,
        currency: true,
        measurementSystem: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        userPreferences: {
          select: {
            emailNotifications: true,
            flightAlerts: true,
            tripReminders: true,
            groupActivityNotifications: true,
            marketingEmails: true,
            profileVisibility: true,
            activityStatusVisible: true,
            allowDataAnalytics: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Default preferences
    const defaultPreferences = {
      emailNotifications: true,
      flightAlerts: true,
      tripReminders: true,
      groupActivityNotifications: true,
      marketingEmails: false,
      profileVisibility: false,
      activityStatusVisible: true,
      allowDataAnalytics: false,
    };

    // Merge userPreferences into the main user object
    const result = {
      ...user,
      ...(user.userPreferences || defaultPreferences),
    };
    delete result.userPreferences;

    return result;
  } catch (error) {
    // Handle table not existing (migration not run)
    if (
      error.code === "P2021" ||
      error.code === "P2001" ||
      error.message?.includes("does not exist")
    ) {
      console.warn(
        "UserPreferences table may not exist yet, fetching user without preferences:",
        error.message
      );

      // Fallback: fetch user without preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          userRole: true,
          currency: true,
          measurementSystem: true,
          timezone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return null;
      }

      // Return user with default preferences
      return {
        ...user,
        emailNotifications: true,
        flightAlerts: true,
        tripReminders: true,
        groupActivityNotifications: true,
        marketingEmails: false,
        profileVisibility: false,
        activityStatusVisible: true,
        allowDataAnalytics: false,
      };
    }

    // Re-throw other errors through error handler
    throw handlePrismaError(error, { operation: "get user settings", entity: "user" });
  }
};

/**
 * Updates user profile information (name, email)
 * @param {string} userId - UUID of the user
 * @param {Object} updateData - Object containing fields to update (name, email)
 * @returns {Promise<Object>} Updated user object
 * @throws {AppError} If user not found or email already exists
 */
module.exports.updateUserProfile = withErrorHandling(
  async function updateUserProfile(userId, updateData) {
    const { name, email } = updateData;

    // Get current user to check OAuth status
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        authProvider: true,
        email: true,
      },
    });

    if (!currentUser) {
      throw NotFoundError.user();
    }

    // Build update data object
    const updateDataObj = {};

    // Validate and add name if provided
    ObjectBuilder.addStringField(updateDataObj, "name", name);

    // Validate and add email if provided
    if (email !== undefined && email !== null && StringValidator.isNonEmpty(email)) {
      const trimmedEmail = email.trim();

      // Prevent OAuth users from changing their email
      const isOAuthUser = currentUser.authProvider && currentUser.authProvider !== "email";
      if (isOAuthUser && trimmedEmail !== currentUser.email) {
        throw AuthorizationError.oauthEmailChange(currentUser.authProvider);
      }

      // Validate email format
      EmailValidator.validate(trimmedEmail);

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email: EmailValidator.sanitize(trimmedEmail) },
      });

      if (existingUser && existingUser.id !== userId) {
        throw ConflictError.emailExists();
      }

      updateDataObj.email = EmailValidator.sanitize(trimmedEmail);
    }

    // Ensure at least one field is being updated
    ObjectBuilder.ensureNotEmpty(updateDataObj, "profile fields");

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateDataObj,
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        currency: true,
        measurementSystem: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  },
  { operation: "update user profile", entity: "user" }
);

/**
 * Updates user preferences (currency, measurementSystem, timezone)
 * @param {string} userId - UUID of the user
 * @param {Object} preferences - Object containing preference fields
 * @returns {Promise<Object>} Updated user object
 * @throws {AppError} If user not found
 */
module.exports.updateUserPreferences = withErrorHandling(
  async function updateUserPreferences(userId, preferences) {
    const { currency, measurementSystem, timezone } = preferences;

    console.log("[DEBUG] updateUserPreferences called:");
    console.log("  User ID:", userId);
    console.log("  Currency:", currency, "(type:", typeof currency, ")");
    console.log("  Measurement System:", measurementSystem, "(type:", typeof measurementSystem, ")");
    console.log("  Timezone:", timezone, "(type:", typeof timezone, ")");

    // Build update data object
    const updateDataObj = {};

    // Validate and add currency
    ObjectBuilder.addStringField(updateDataObj, "currency", currency);

    // Validate and add measurement system
    if (measurementSystem !== undefined && measurementSystem !== null && StringValidator.isNonEmpty(measurementSystem)) {
      const validatedSystem = MeasurementSystemValidator.validate(measurementSystem);
      updateDataObj.measurementSystem = validatedSystem;
    }

    // Validate and add timezone
    ObjectBuilder.addStringField(updateDataObj, "timezone", timezone);

    console.log("[DEBUG] Final updateDataObj:", JSON.stringify(updateDataObj, null, 2));

    // Ensure at least one field is being updated
    ObjectBuilder.ensureNotEmpty(updateDataObj, "preference fields");

    console.log("[DEBUG] Updating database with:", updateDataObj);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateDataObj,
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        currency: true,
        measurementSystem: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log("[DEBUG] Database update successful. Updated user timezone:", updatedUser.timezone);
    return updatedUser;
  },
  { operation: "update user preferences", entity: "user" }
);

/**
 * Updates user password after verifying current password
 * @param {string} userId - UUID of the user
 * @param {string} currentPassword - Current plain text password
 * @param {string} newPassword - New plain text password to be hashed
 * @returns {Promise<Object>} Updated user object
 * @throws {AppError} If current password is incorrect or user not found
 */
module.exports.updateUserPassword = withErrorHandling(
  async function updateUserPassword(userId, currentPassword, newPassword) {
    // Retrieve user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw NotFoundError.user();
    }

    // Verify current password
    const isValidPassword = await argon2.verify(user.passwordHash, currentPassword);

    if (!isValidPassword) {
      throw AuthenticationError.incorrectPassword();
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return { success: true };
  },
  { operation: "update user password", entity: "user" }
);

/**
 * Deletes a user account and all associated data
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object>} Success confirmation object
 * @throws {AppError} If user not found
 */
module.exports.deleteUser = withErrorHandling(
  async function deleteUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw NotFoundError.user();
    }

    // Prisma will cascade delete all related records
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  },
  { operation: "delete user", entity: "user" }
);

/**
 * Updates user notification preferences
 * @param {string} userId - UUID of the user
 * @param {Object} preferences - Object containing notification preference fields
 * @returns {Promise<Object>} Updated user preferences object
 * @throws {AppError} If user not found
 */
module.exports.updateNotificationPreferences = withErrorHandling(
  async function updateNotificationPreferences(userId, preferences) {
    const {
      emailNotifications,
      flightAlerts,
      tripReminders,
      groupActivityNotifications,
      marketingEmails,
    } = preferences;

    // Ensure user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw NotFoundError.user();
    }

    // Build update data object
    const updateDataObj = {};

    ObjectBuilder.addBooleanField(updateDataObj, "emailNotifications", emailNotifications);
    ObjectBuilder.addBooleanField(updateDataObj, "flightAlerts", flightAlerts);
    ObjectBuilder.addBooleanField(updateDataObj, "tripReminders", tripReminders);
    ObjectBuilder.addBooleanField(updateDataObj, "groupActivityNotifications", groupActivityNotifications);
    ObjectBuilder.addBooleanField(updateDataObj, "marketingEmails", marketingEmails);

    // Ensure at least one field is being updated
    ObjectBuilder.ensureNotEmpty(updateDataObj, "notification preference fields");

    // Upsert user preferences (create if doesn't exist, update if exists)
    const updatedPreferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: updateDataObj,
      create: {
        userId,
        ...updateDataObj,
        // Set defaults for fields not provided
        emailNotifications: updateDataObj.emailNotifications ?? true,
        flightAlerts: updateDataObj.flightAlerts ?? true,
        tripReminders: updateDataObj.tripReminders ?? true,
        groupActivityNotifications: updateDataObj.groupActivityNotifications ?? true,
        marketingEmails: updateDataObj.marketingEmails ?? false,
      },
      select: {
        emailNotifications: true,
        flightAlerts: true,
        tripReminders: true,
        groupActivityNotifications: true,
        marketingEmails: true,
      },
    });

    return updatedPreferences;
  },
  { operation: "update notification preferences", entity: "user preferences" }
);

/**
 * Updates user privacy preferences
 * @param {string} userId - UUID of the user
 * @param {Object} preferences - Object containing privacy preference fields
 * @returns {Promise<Object>} Updated user preferences object
 * @throws {AppError} If user not found
 */
module.exports.updatePrivacyPreferences = withErrorHandling(
  async function updatePrivacyPreferences(userId, preferences) {
    const { profileVisibility, activityStatusVisible, allowDataAnalytics } = preferences;

    // Ensure user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw NotFoundError.user();
    }

    // Build update data object
    const updateDataObj = {};

    ObjectBuilder.addBooleanField(updateDataObj, "profileVisibility", profileVisibility);
    ObjectBuilder.addBooleanField(updateDataObj, "activityStatusVisible", activityStatusVisible);
    ObjectBuilder.addBooleanField(updateDataObj, "allowDataAnalytics", allowDataAnalytics);

    // Ensure at least one field is being updated
    ObjectBuilder.ensureNotEmpty(updateDataObj, "privacy preference fields");

    // Upsert user preferences (create if doesn't exist, update if exists)
    const updatedPreferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: updateDataObj,
      create: {
        userId,
        ...updateDataObj,
        // Set defaults for fields not provided
        profileVisibility: updateDataObj.profileVisibility ?? false,
        activityStatusVisible: updateDataObj.activityStatusVisible ?? true,
        allowDataAnalytics: updateDataObj.allowDataAnalytics ?? false,
      },
      select: {
        profileVisibility: true,
        activityStatusVisible: true,
        allowDataAnalytics: true,
      },
    });

    return updatedPreferences;
  },
  { operation: "update privacy preferences", entity: "user preferences" }
);

/**
 * Finds a user by OAuth provider ID and provider name
 * @param {string} providerId - OAuth provider's user ID
 * @param {string} provider - OAuth provider name ('google' or 'facebook')
 * @returns {Promise<Object|null>} User object without password hash, or null if not found
 */
module.exports.findUserByProvider = withErrorHandling(
  async function findUserByProvider(providerId, provider) {
    const normalizedProvider = provider.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        providerId: providerId,
        authProvider: normalizedProvider,
      },
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        authProvider: true,
        providerId: true,
        providerEmail: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },
  { operation: "find user by OAuth provider", entity: "user" }
);

/**
 * Timezone conversion utility
 */
const TimezoneConverter = {
  /**
   * Converts IANA timezone to GMT format
   * @param {string} ianaTimezone - IANA timezone (e.g., "Asia/Singapore")
   * @returns {string} GMT format (e.g., "GMT+8")
   */
  toGMT(ianaTimezone) {
    if (!ianaTimezone) return "GMT+8"; // Default to Singapore

    // If already in GMT format, return as is
    if (ianaTimezone.match(/^GMT[+-]\d+$/)) {
      return ianaTimezone;
    }

    // Map common IANA timezones to GMT format
    const timezoneMap = {
      "Asia/Singapore": "GMT+8",
      "Asia/Hong_Kong": "GMT+8",
      "Asia/Shanghai": "GMT+8",
      "Asia/Taipei": "GMT+8",
      "Asia/Kuala_Lumpur": "GMT+8",
      "Asia/Manila": "GMT+8",
      "America/New_York": "GMT-5",
      "America/Chicago": "GMT-6",
      "America/Denver": "GMT-7",
      "America/Los_Angeles": "GMT-8",
      "America/Phoenix": "GMT-7",
      "Europe/London": "GMT+0",
      "Europe/Paris": "GMT+1",
      "Europe/Berlin": "GMT+1",
      "Europe/Rome": "GMT+1",
      "Europe/Madrid": "GMT+1",
      "Asia/Tokyo": "GMT+9",
      "Asia/Seoul": "GMT+9",
      "Australia/Sydney": "GMT+10",
      "Australia/Melbourne": "GMT+10",
      "Australia/Brisbane": "GMT+10",
      "Pacific/Auckland": "GMT+12",
    };

    return timezoneMap[ianaTimezone] || "GMT+8"; // Default to Singapore
  },

  /**
   * Determines currency based on timezone
   * @param {string} timezone - Timezone in GMT format (e.g., "GMT+8")
   * @returns {string} Currency code
   */
  getCurrency(timezone) {
    // Singapore is GMT+8
    if (timezone === "GMT+8") {
      return "SGD";
    }
    return "USD";
  },
};

/**
 * Creates a new user from OAuth provider information
 * @param {Object} oauthUserInfo - OAuth user information object
 * @param {string} oauthUserInfo.providerId - OAuth provider's user ID
 * @param {string} oauthUserInfo.email - User's email address
 * @param {string} oauthUserInfo.name - User's full name
 * @param {string} [oauthUserInfo.picture] - Optional profile picture URL
 * @param {string} provider - OAuth provider name ('google' or 'facebook')
 * @param {Object} [req] - Express request object (optional, for accessing timezone cookie)
 * @returns {Promise<Object>} Created user object without password hash
 * @throws {AppError} If email already exists or validation fails
 */
module.exports.createOAuthUser = withErrorHandling(
  async function createOAuthUser(oauthUserInfo, provider, req = null) {
    const normalizedProvider = provider.toLowerCase().trim();

    // Detect timezone from cookie or use default
    let timezone = "GMT+8"; // Default to Singapore
    if (req?.cookies?.user_timezone) {
      timezone = req.cookies.user_timezone;
    }

    // Ensure timezone is in GMT format (convert if needed)
    timezone = TimezoneConverter.toGMT(timezone);

    // Determine currency based on timezone
    const currency = TimezoneConverter.getCurrency(timezone);

    const user = await prisma.user.create({
      data: {
        name: oauthUserInfo.name,
        email: oauthUserInfo.email,
        authProvider: normalizedProvider,
        providerId: oauthUserInfo.providerId,
        providerEmail: oauthUserInfo.email,
        profilePictureUrl: oauthUserInfo.picture || null,
        passwordHash: null, // OAuth users don't have passwords
        timezone: timezone,
        currency: currency,
      },
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        authProvider: true,
        providerId: true,
        providerEmail: true,
        profilePictureUrl: true,
        timezone: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },
  { operation: "create OAuth user", entity: "user" }
);

/**
 * Links an OAuth provider to an existing user account
 * @param {string} userId - UUID of the existing user
 * @param {Object} oauthUserInfo - OAuth user information object
 * @param {string} oauthUserInfo.providerId - OAuth provider's user ID
 * @param {string} oauthUserInfo.email - User's email address
 * @param {string} [oauthUserInfo.picture] - Optional profile picture URL
 * @param {string} provider - OAuth provider name ('google' or 'facebook')
 * @returns {Promise<Object>} Updated user object without password hash
 * @throws {AppError} If user not found or update fails
 */
module.exports.linkOAuthProvider = withErrorHandling(
  async function linkOAuthProvider(userId, oauthUserInfo, provider) {
    const normalizedProvider = provider.toLowerCase().trim();

    // Verify user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw NotFoundError.user();
    }

    // Update user with OAuth provider information
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        authProvider: normalizedProvider,
        providerId: oauthUserInfo.providerId,
        providerEmail: oauthUserInfo.email,
        // Only update profile picture if provided and user doesn't have one
        profilePictureUrl:
          oauthUserInfo.picture && !existingUser.profilePictureUrl
            ? oauthUserInfo.picture
            : existingUser.profilePictureUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        authProvider: true,
        providerId: true,
        providerEmail: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },
  { operation: "link OAuth provider", entity: "user" }
);

/**
 * Updates user's OAuth provider information
 * Used when user already has an OAuth account but is signing in with a different provider
 * @param {string} userId - UUID of the user
 * @param {Object} oauthUserInfo - OAuth user information object
 * @param {string} oauthUserInfo.providerId - OAuth provider's user ID
 * @param {string} oauthUserInfo.email - User's email address
 * @param {string} [oauthUserInfo.picture] - Optional profile picture URL
 * @param {string} provider - OAuth provider name ('google' or 'facebook')
 * @returns {Promise<Object>} Updated user object without password hash
 * @throws {AppError} If user not found or update fails
 */
module.exports.updateOAuthProvider = withErrorHandling(
  async function updateOAuthProvider(userId, oauthUserInfo, provider) {
    const normalizedProvider = provider.toLowerCase().trim();

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        authProvider: normalizedProvider,
        providerId: oauthUserInfo.providerId,
        providerEmail: oauthUserInfo.email,
        // Only update profile picture if provided
        profilePictureUrl: oauthUserInfo.picture || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        authProvider: true,
        providerId: true,
        providerEmail: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },
  { operation: "update OAuth provider", entity: "user" }
);
