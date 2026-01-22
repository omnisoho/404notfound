/**
 * Application-wide constants
 */

const APP_CONSTANTS = {
  VALIDATION: {
    MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
    MIN_PASSWORD_LENGTH: 8,
  },
  MESSAGES: {
    FILE_SIZE_ERROR: "File size must be less than 2MB",
    PASSWORD_REQUIRED: "Please fill in all password fields",
    PASSWORD_MISMATCH: "New passwords do not match",
    PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
    PASSWORD_UPDATED: "Password updated successfully",
    PROFILE_SAVED: "Profile updated successfully",
    PROFILE_RESET: "Profile reset to original values",
    EXPORT_PREPARING: "Preparing your data export...",
    EXPORT_READY: "Data export ready. Check your downloads folder.",
    DELETE_CONFIRM:
      "Are you sure you want to delete your account? This action cannot be undone.",
    DELETE_FINAL:
      "This will permanently delete all your data. Type 'DELETE' to confirm.",
    DELETE_PROCESSING: "Account deletion requested. Processing...",
    NAME_REQUIRED: "Name is required",
    EMAIL_REQUIRED: "Email is required",
    EMAIL_INVALID: "Please enter a valid email address",
    EMAIL_EXISTS: "This email is already in use",
    NO_CHANGES: "No changes detected",
    PREFERENCES_SAVED: "Preferences updated successfully",
    PROFILE_LOAD_ERROR: "Failed to load settings. Please refresh the page.",
    PROFILE_SAVE_ERROR: "Failed to save profile. Please try again.",
    PREFERENCES_SAVE_ERROR: "Failed to save preferences. Please try again.",
    PASSWORD_CHANGE_ERROR: "Failed to change password. Please try again.",
    EXPORT_ERROR: "Failed to export data. Please try again.",
    DELETE_ERROR: "Failed to delete account. Please try again.",
  },
};
