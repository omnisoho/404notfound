const express = require("express");
const { verifyToken } = require("../middleware/auth.middleware");
const {
  getUserSettings,
  updateUserProfile,
  updateUserPreferences,
  updateUserPassword,
  deleteUser,
  updateNotificationPreferences,
  updatePrivacyPreferences,
} = require("../models/User.model");

const router = express.Router();

/**
 * GET /api/user/settings
 * Retrieves the authenticated user's settings
 * Requires authentication via JWT token
 */
router.get("/settings", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userSettings = await getUserSettings(userId);

    if (!userSettings) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(userSettings);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/user/profile
 * Updates the authenticated user's profile information (name, email)
 * Requires authentication via JWT token
 */
router.put("/profile", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, email } = req.body;

    // Validate that at least one field is provided
    if (!name && !email) {
      return res
        .status(400)
        .json({ error: "At least one field (name or email) must be provided" });
    }

    // Validate name if provided
    if (
      name !== undefined &&
      name !== null &&
      typeof name === "string" &&
      !name.trim()
    ) {
      return res.status(400).json({ error: "Name cannot be empty" });
    }

    // Validate email format if provided
    if (email !== undefined && email !== null) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ error: "Email cannot be empty" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: "Invalid email format" });
      }
    }

    const updatedUser = await updateUserProfile(userId, { name, email });
    res.status(200).json(updatedUser);
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 409) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * PUT /api/user/preferences
 * Updates the authenticated user's preferences (currency, measurementSystem, timezone)
 * Requires authentication via JWT token
 */
router.put("/preferences", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { currency, measurementSystem, timezone } = req.body;

    console.log("[DEBUG] Preferences update request received:");
    console.log("  User ID:", userId);
    console.log("  Currency:", currency);
    console.log("  Measurement System:", measurementSystem);
    console.log("  Timezone:", timezone);
    console.log("  Full body:", JSON.stringify(req.body, null, 2));

    // Validate that at least one field is provided
    if (!currency && !measurementSystem && !timezone) {
      console.log("[DEBUG] Validation failed: No fields provided");
      return res.status(400).json({
        error:
          "At least one preference field (currency, measurementSystem, timezone) must be provided",
      });
    }

    // Validate currency format if provided
    if (currency !== undefined && currency !== null) {
      if (typeof currency !== "string" || !currency.trim()) {
        return res
          .status(400)
          .json({ error: "Currency must be a non-empty string" });
      }
    }

    // Validate measurementSystem if provided
    if (measurementSystem !== undefined && measurementSystem !== null) {
      if (typeof measurementSystem !== "string" || !measurementSystem.trim()) {
        return res
          .status(400)
          .json({ error: "Measurement system must be a non-empty string" });
      }
      if (!["metric", "imperial"].includes(measurementSystem.trim())) {
        return res
          .status(400)
          .json({ error: "Measurement system must be 'metric' or 'imperial'" });
      }
    }

    // Validate timezone format if provided
    if (timezone !== undefined && timezone !== null) {
      if (typeof timezone !== "string" || !timezone.trim()) {
        return res
          .status(400)
          .json({ error: "Timezone must be a non-empty string" });
      }
    }

    const updatedUser = await updateUserPreferences(userId, {
      currency,
      measurementSystem,
      timezone,
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * PUT /api/user/password
 * Updates the authenticated user's password
 * Requires authentication via JWT token and current password verification
 */
router.put("/password", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters long" });
    }

    // Validate that new password is different from current password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    await updateUserPassword(userId, currentPassword, newPassword);
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({ error: error.message });
    }
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /api/user/account
 * Deletes the authenticated user's account and all associated data
 * Requires authentication via JWT token
 */
router.delete("/account", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await deleteUser(userId);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * PUT /api/user/notifications
 * Updates the authenticated user's notification preferences
 * Requires authentication via JWT token
 */
router.put("/notifications", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      emailNotifications,
      flightAlerts,
      tripReminders,
      groupActivityNotifications,
      marketingEmails,
    } = req.body;

    // Validate that at least one field is provided
    if (
      emailNotifications === undefined &&
      flightAlerts === undefined &&
      tripReminders === undefined &&
      groupActivityNotifications === undefined &&
      marketingEmails === undefined
    ) {
      return res.status(400).json({
        error: "At least one notification preference field must be provided",
      });
    }

    // Validate boolean fields
    const booleanFields = {
      emailNotifications,
      flightAlerts,
      tripReminders,
      groupActivityNotifications,
      marketingEmails,
    };

    for (const [field, value] of Object.entries(booleanFields)) {
      if (value !== undefined && typeof value !== "boolean") {
        return res.status(400).json({
          error: `${field} must be a boolean value`,
        });
      }
    }

    const updatedPreferences = await updateNotificationPreferences(userId, {
      emailNotifications,
      flightAlerts,
      tripReminders,
      groupActivityNotifications,
      marketingEmails,
    });

    res.status(200).json(updatedPreferences);
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 404) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * PUT /api/user/privacy
 * Updates the authenticated user's privacy preferences
 * Requires authentication via JWT token
 */
router.put("/privacy", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { profileVisibility, activityStatusVisible, allowDataAnalytics } =
      req.body;

    // Validate that at least one field is provided
    if (
      profileVisibility === undefined &&
      activityStatusVisible === undefined &&
      allowDataAnalytics === undefined
    ) {
      return res.status(400).json({
        error: "At least one privacy preference field must be provided",
      });
    }

    // Validate boolean fields
    const booleanFields = {
      profileVisibility,
      activityStatusVisible,
      allowDataAnalytics,
    };

    for (const [field, value] of Object.entries(booleanFields)) {
      if (value !== undefined && typeof value !== "boolean") {
        return res.status(400).json({
          error: `${field} must be a boolean value`,
        });
      }
    }

    const updatedPreferences = await updatePrivacyPreferences(userId, {
      profileVisibility,
      activityStatusVisible,
      allowDataAnalytics,
    });

    res.status(200).json(updatedPreferences);
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 404) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;
