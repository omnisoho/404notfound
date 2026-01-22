const express = require("express");
const { requireAdmin } = require("../middleware/auth.middleware");
const {
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
  resetUserPassword,
  getUserStats,
  getAnalyticsData,
} = require("../models/Admin.model");
const { ValidationError } = require("../utils/errorHandler");

const router = express.Router();

/**
 * GET /api/admin/users
 * Get all users with pagination and filters (admin only)
 * Query params: page, limit, search, role, dateFrom, dateTo
 */
router.get("/users", requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, search, role, dateFrom, dateTo, sortBy, sortOrder } = req.query;

    const options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      filters: {
        ...(search && { search }),
        ...(role && { role }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      },
      sort: {
        ...(sortBy && { sortBy }),
        ...(sortOrder && { sortOrder }),
      },
    };

    const result = await getAllUsers(options);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users/:userId
 * Get detailed user information by ID (admin only)
 */
router.get("/users/:userId", requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await getUserById(userId);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * PUT /api/admin/users/:userId
 * Update user information by admin (admin only)
 * Body: name, email, userRole, currency, measurementSystem, timezone
 */
router.put("/users/:userId", requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { name, email, userRole, currency, measurementSystem, timezone } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Build update data object (only include defined values)
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (userRole !== undefined) updateData.userRole = userRole;
    if (currency !== undefined) updateData.currency = currency;
    if (measurementSystem !== undefined) updateData.measurementSystem = measurementSystem;
    if (timezone !== undefined) updateData.timezone = timezone;

    // Check if at least one field is provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "At least one field must be provided for update" });
    }

    const updatedUser = await updateUserByAdmin(userId, updateData);

    res.status(200).json({
      success: true,
      user: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.statusCode === 400 || error.statusCode === 409) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user account by admin (admin only)
 */
router.delete("/users/:userId", requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const result = await deleteUserByAdmin(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      ...result,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /api/admin/users/:userId/reset-password
 * Reset user password and return temporary password (admin only)
 */
router.post("/users/:userId/reset-password", requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const result = await resetUserPassword(userId);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/admin/stats
 * Get quick statistics for dashboard cards (admin only)
 */
router.get("/stats", requireAdmin, async (req, res, next) => {
  try {
    const stats = await getUserStats();

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: stats.totalUsers,
        activeUsersLast30Days: stats.activeUsers,
        totalTrips: stats.totalTrips,
        quizCompletions: stats.quizCompletions,
        totalPersonas: stats.totalPersonas,
        newUsersToday: stats.newUsersToday,
        roleDistribution: stats.roleDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics
 * Get comprehensive analytics data for charts (admin only)
 * Query params: dateRange (7d, 30d, 90d, 365d, all)
 */
router.get("/analytics", requireAdmin, async (req, res, next) => {
  try {
    const { dateRange = "30d" } = req.query;

    // Validate dateRange
    const validDateRanges = ["7d", "30d", "90d", "365d", "all"];
    if (!validDateRanges.includes(dateRange)) {
      return res.status(400).json({
        error: `Invalid dateRange. Must be one of: ${validDateRanges.join(", ")}`,
      });
    }

    const analyticsData = await getAnalyticsData(dateRange);

    res.status(200).json({
      success: true,
      ...analyticsData,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

