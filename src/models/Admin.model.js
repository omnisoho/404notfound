const prisma = require("./prismaClient");
const argon2 = require("argon2");
const crypto = require("crypto");
const {
  ValidationError,
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
 * Admin repository - Handles admin operations for user management
 * Follows SOLID principles with centralized error handling
 */

/**
 * Validates pagination parameters
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Object} Validated pagination object with skip and take
 */
function validatePagination(page = 1, limit = 20) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return {
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    page: pageNum,
    limit: limitNum,
  };
}

/**
 * Builds Prisma where clause from filters
 * @param {Object} filters - Filter object with search, role, dateFrom, dateTo
 * @returns {Object} Prisma where clause
 */
function buildUserFilters(filters = {}) {
  const where = {};

  // Search filter (name or email)
  if (filters.search && StringValidator.isNonEmpty(filters.search)) {
    const searchTerm = filters.search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Role filter
  if (filters.role && ["user", "admin", "premium"].includes(filters.role)) {
    where.userRole = filters.role;
  }

  // Date range filter (registration date)
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      // Add one day to include the entire end date
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  return where;
}

/**
 * Gets all users with pagination and filters (admin only)
 * @param {Object} options - Options object
 * @param {number} [options.page=1] - Page number (1-indexed)
 * @param {number} [options.limit=20] - Items per page (max 100)
 * @param {Object} [options.filters] - Filter object
 * @param {string} [options.filters.search] - Search term for name or email
 * @param {string} [options.filters.role] - Filter by user role (user, admin, premium)
 * @param {string} [options.filters.dateFrom] - Filter users created from this date (ISO string)
 * @param {string} [options.filters.dateTo] - Filter users created until this date (ISO string)
 * @param {Object} [options.sort] - Sort object
 * @param {string} [options.sort.sortBy] - Field to sort by (name, email, userRole, createdAt, updatedAt, authProvider)
 * @param {string} [options.sort.sortOrder] - Sort order (asc, desc)
 * @returns {Promise<Object>} Object with users array, pagination info, and total count
 * @throws {AppError} If validation fails
 */
module.exports.getAllUsers = withErrorHandling(
  async function getAllUsers(options = {}) {
    const { page = 1, limit = 20, filters = {}, sort = {} } = options;
    const pagination = validatePagination(page, limit);
    const where = buildUserFilters(filters);

    // Build orderBy clause
    const validSortFields = ["name", "email", "userRole", "createdAt", "updatedAt", "authProvider"];
    const sortBy = validSortFields.includes(sort.sortBy) ? sort.sortBy : "createdAt";
    const sortOrder = sort.sortOrder === "asc" ? "asc" : "desc";
    const orderBy = { [sortBy]: sortOrder };

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        authProvider: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true,
        lastActiveAt: true,
        isOnline: true,
        _count: {
          select: {
            tripsCreated: true,
            quizResponses: true,
          },
        },
      },
      orderBy,
    });

    return {
      users,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  },
  { operation: "get all users", entity: "admin" }
);

/**
 * Gets detailed user information by ID (admin only)
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object>} Detailed user object with related data
 * @throws {AppError} If user not found
 */
module.exports.getUserById = withErrorHandling(
  async function getUserById(userId) {
    if (!userId || typeof userId !== "string") {
      throw ValidationError.invalidInput("User ID is required");
    }

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
        timezone: true,
        currency: true,
        measurementSystem: true,
        createdAt: true,
        updatedAt: true,
        lastActiveAt: true,
        isOnline: true,
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
        personalityProfile: {
          select: {
            id: true,
            personaId: true,
            personaMatchConfidence: true,
            preferredTripPace: true,
            lastQuizCompletedAt: true,
          },
        },
        _count: {
          select: {
            tripsCreated: true,
            tripMemberships: true,
            quizResponses: true,
            flights: true,
            diaryEntries: true,
          },
        },
      },
    });

    if (!user) {
      throw NotFoundError.user();
    }

    return user;
  },
  { operation: "get user by ID", entity: "admin" }
);

/**
 * Updates user information by admin (admin override)
 * @param {string} userId - UUID of the user to update
 * @param {Object} updateData - Object containing fields to update
 * @param {string} [updateData.name] - User's name
 * @param {string} [updateData.email] - User's email
 * @param {string} [updateData.userRole] - User role (user, admin, premium)
 * @param {string} [updateData.currency] - User's currency preference
 * @param {string} [updateData.measurementSystem] - Measurement system (metric, imperial)
 * @param {string} [updateData.timezone] - User's timezone
 * @returns {Promise<Object>} Updated user object
 * @throws {AppError} If user not found, email already exists, or validation fails
 */
module.exports.updateUserByAdmin = withErrorHandling(
  async function updateUserByAdmin(userId, updateData) {
    if (!userId || typeof userId !== "string") {
      throw ValidationError.invalidInput("User ID is required");
    }

    const { name, email, userRole, currency, measurementSystem, timezone } = updateData;

    // Get current user to check existence
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        authProvider: true,
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

    // Validate and add userRole if provided
    if (userRole !== undefined && userRole !== null) {
      if (!["user", "admin", "premium"].includes(userRole)) {
        throw ValidationError.invalidInput("Invalid user role. Must be 'user', 'admin', or 'premium'");
      }
      updateDataObj.userRole = userRole;
    }

    // Validate and add currency if provided
    ObjectBuilder.addStringField(updateDataObj, "currency", currency);

    // Validate and add measurement system if provided
    if (measurementSystem !== undefined && measurementSystem !== null && StringValidator.isNonEmpty(measurementSystem)) {
      const validatedSystem = MeasurementSystemValidator.validate(measurementSystem);
      updateDataObj.measurementSystem = validatedSystem;
    }

    // Validate and add timezone if provided
    ObjectBuilder.addStringField(updateDataObj, "timezone", timezone);

    // Ensure at least one field is being updated
    ObjectBuilder.ensureNotEmpty(updateDataObj, "update fields");

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateDataObj,
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        authProvider: true,
        currency: true,
        measurementSystem: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  },
  { operation: "update user by admin", entity: "admin" }
);

/**
 * Deletes a user account by admin (admin override)
 * @param {string} userId - UUID of the user to delete
 * @returns {Promise<Object>} Success confirmation object
 * @throws {AppError} If user not found
 */
module.exports.deleteUserByAdmin = withErrorHandling(
  async function deleteUserByAdmin(userId) {
    if (!userId || typeof userId !== "string") {
      throw ValidationError.invalidInput("User ID is required");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw NotFoundError.user();
    }

    // Prisma will cascade delete all related records
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true, deletedUser: { id: user.id, email: user.email } };
  },
  { operation: "delete user by admin", entity: "admin" }
);

/**
 * Generates a secure random password
 * @param {number} length - Password length (default 12)
 * @returns {string} Generated password
 */
function generateSecurePassword(length = 12) {
  // Generate random bytes and convert to base64
  // Remove special characters that might cause issues in URLs/form fields
  const buffer = crypto.randomBytes(length);
  const password = buffer
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, length);

  // Ensure password has at least one lowercase, one uppercase, one number
  // This is a simple approach - could be enhanced
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (hasLower && hasUpper && hasNumber) {
    return password;
  }

  // If doesn't meet requirements, regenerate
  return generateSecurePassword(length);
}

/**
 * Resets a user's password and returns the temporary password (admin only)
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object>} Object with success status and temporary password
 * @throws {AppError} If user not found or user is OAuth-only
 */
module.exports.resetUserPassword = withErrorHandling(
  async function resetUserPassword(userId) {
    if (!userId || typeof userId !== "string") {
      throw ValidationError.invalidInput("User ID is required");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        authProvider: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw NotFoundError.user();
    }

    // Check if user is OAuth-only (no password set)
    if (user.authProvider !== "email" && !user.passwordHash) {
      throw ValidationError.invalidInput("Cannot reset password for OAuth-only user. OAuth users do not have passwords.");
    }

    // Generate secure temporary password
    const tempPassword = generateSecurePassword(12);

    // Hash the new password
    const passwordHash = await argon2.hash(tempPassword);

    // Update user's password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
      },
    });

    // Return temporary password (frontend should display this securely)
    return {
      success: true,
      temporaryPassword: tempPassword,
      userId: user.id,
      email: user.email,
      message: "Password reset successfully. User must change password on next login.",
    };
  },
  { operation: "reset user password", entity: "admin" }
);

/**
 * Gets quick statistics for admin dashboard cards
 * @returns {Promise<Object>} Object with various statistics
 */
module.exports.getUserStats = withErrorHandling(
  async function getUserStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Get total counts in parallel
    const [totalUsers, activeUsers, totalTrips, quizCompletions, totalPersonas, newUsersToday] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.trip.count(),
      prisma.personalityProfile.count({
        where: {
          lastQuizCompletedAt: {
            not: null,
          },
        },
      }),
      prisma.persona.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),
    ]);

    // Get user role distribution
    const roleDistribution = await prisma.user.groupBy({
      by: ["userRole"],
      _count: {
        userRole: true,
      },
    });

    const roleCounts = {};
    roleDistribution.forEach((item) => {
      roleCounts[item.userRole] = item._count.userRole;
    });

    return {
      totalUsers,
      activeUsers,
      totalTrips,
      quizCompletions,
      totalPersonas,
      newUsersToday,
      roleDistribution: roleCounts,
    };
  },
  { operation: "get user stats", entity: "admin" }
);

/**
 * Normalizes date range and returns start/end dates
 * @param {string} dateRange - Date range string (7d, 30d, 90d, 365d, all)
 * @returns {Object} Object with startDate and endDate (or null for all time)
 */
function normalizeDateRange(dateRange = "30d") {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  let startDate = new Date();

  switch (dateRange) {
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
    case "365d":
      startDate.setDate(startDate.getDate() - 365);
      break;
    case "all":
    default:
      startDate = null; // All time
      break;
  }

  if (startDate) {
    startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

/**
 * Groups date records by day for time series charts
 * @param {Array} records - Array of records with createdAt field
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of objects with date and count
 */
function groupByDay(records, startDate, endDate) {
  const dateMap = new Map();
  const currentDate = new Date(startDate);

  // Initialize all dates in range with 0
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0];
    dateMap.set(dateKey, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Count records per day
  records.forEach((record) => {
    const dateKey = new Date(record.createdAt).toISOString().split("T")[0];
    const currentCount = dateMap.get(dateKey) || 0;
    dateMap.set(dateKey, currentCount + 1);
  });

  // Convert to array format for charts
  return Array.from(dateMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}

/**
 * Gets comprehensive analytics data for charts and graphs (admin only)
 * @param {string} [dateRange="30d"] - Date range filter (7d, 30d, 90d, 365d, all)
 * @returns {Promise<Object>} Object with analytics data for various charts
 */
module.exports.getAnalyticsData = withErrorHandling(
  async function getAnalyticsData(dateRange = "30d") {
    const { startDate, endDate } = normalizeDateRange(dateRange);

    // Build date filter
    const dateFilter = startDate
      ? {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }
      : {
          createdAt: {
            lte: endDate,
          },
        };

    // Get all data in parallel
    const [users, trips, quizProfiles, personas, userRoles] = await Promise.all([
      // Get users for growth chart
      prisma.user.findMany({
        where: dateFilter,
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // Get trips for trip creation chart
      prisma.trip.findMany({
        where: dateFilter,
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // Get personality profiles for persona distribution
      prisma.personalityProfile.findMany({
        where: {
          personaId: {
            not: null,
          },
        },
        include: {
          persona: {
            select: {
              id: true,
              name: true,
              archetype: true,
            },
          },
        },
      }),

      // Get all personas
      prisma.persona.findMany({
        select: {
          id: true,
          name: true,
          archetype: true,
        },
      }),

      // Get user role distribution
      prisma.user.groupBy({
        by: ["userRole"],
        _count: {
          userRole: true,
        },
      }),
    ]);

    // Calculate user growth over time
    let userGrowthData = [];
    if (startDate && users.length > 0) {
      userGrowthData = groupByDay(users, startDate, endDate);
    } else if (users.length > 0) {
      // For "all" time, group by month instead
      const monthMap = new Map();
      users.forEach((user) => {
        const date = new Date(user.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      });
      userGrowthData = Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));
    }

    // Calculate trip creation over time
    let tripCreationData = [];
    if (startDate && trips.length > 0) {
      tripCreationData = groupByDay(trips, startDate, endDate);
    } else if (trips.length > 0) {
      // For "all" time, group by month
      const monthMap = new Map();
      trips.forEach((trip) => {
        const date = new Date(trip.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      });
      tripCreationData = Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));
    }

    // Calculate persona distribution
    const personaDistribution = {};
    personas.forEach((persona) => {
      personaDistribution[persona.id] = {
        id: persona.id,
        name: persona.name,
        archetype: persona.archetype,
        count: 0,
      };
    });

    quizProfiles.forEach((profile) => {
      if (profile.personaId && personaDistribution[profile.personaId]) {
        personaDistribution[profile.personaId].count += 1;
      }
    });

    const personaDistributionArray = Object.values(personaDistribution).filter((p) => p.count > 0);

    // Calculate role distribution
    const roleDistribution = {};
    userRoles.forEach((role) => {
      roleDistribution[role.userRole] = role._count.userRole;
    });

    // Calculate active users over time (users with lastActiveAt in date range)
    let activeUsersData = [];
    if (startDate) {
      const activeUsers = await prisma.user.findMany({
        where: {
          lastActiveAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          lastActiveAt: true,
        },
      });

      if (activeUsers.length > 0) {
        activeUsersData = groupByDay(activeUsers, startDate, endDate);
      }
    }

    // Get quiz completion rate
    const totalUsers = await prisma.user.count();
    const quizCompletionRate = totalUsers > 0 ? (quizProfiles.length / totalUsers) * 100 : 0;

    return {
      dateRange,
      userGrowth: {
        labels: userGrowthData.map((d) => d.date),
        data: userGrowthData.map((d) => d.count),
      },
      tripCreation: {
        labels: tripCreationData.map((d) => d.date),
        data: tripCreationData.map((d) => d.count),
      },
      activeUsers: {
        labels: activeUsersData.map((d) => d.date),
        data: activeUsersData.map((d) => d.count),
      },
      personaDistribution: personaDistributionArray.map((p) => ({
        name: p.name,
        archetype: p.archetype,
        count: p.count,
      })),
      roleDistribution,
      quizCompletionRate: Math.round(quizCompletionRate * 100) / 100,
      summary: {
        totalUsers: await prisma.user.count(),
        totalTrips: await prisma.trip.count(),
        totalQuizCompletions: quizProfiles.length,
        totalPersonas: personas.length,
      },
    };
  },
  { operation: "get analytics data", entity: "admin" }
);

