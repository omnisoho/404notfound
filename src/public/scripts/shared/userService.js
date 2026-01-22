/**
 * UserService - Handles user data fetching and token management
 * Follows Single Responsibility Principle: only responsible for user data operations
 */
class UserService {
  /**
   * Retrieves authentication token from localStorage or sessionStorage
   * @returns {string|null} JWT token or null if not found
   */
  static getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }

  /**
   * Fetches current user settings from the API
   * @returns {Promise<Object>} User settings object containing name, email, timezone, etc.
   * @throws {Error} If token is missing or API request fails
   */
  static async fetchUserSettings() {
    const token = this.getToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch("/api/user/settings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication failed");
      }
      throw new Error(`Failed to fetch user settings: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Formats timezone string to display format (e.g., "Asia/Singapore" -> "GMT+8")
   * @param {string} timezone - IANA timezone string or GMT format string
   * @returns {string} Formatted timezone string in GMT format
   */
  static formatTimezone(timezone) {
    if (!timezone) return "GMT+0";

    // If already in GMT format, return as is
    if (timezone.match(/^GMT[+-]\d+$/)) {
      return timezone;
    }

    try {
      // Use Intl.DateTimeFormat with longOffset to get GMT offset
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en", {
        timeZone: timezone,
        timeZoneName: "longOffset",
      });

      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find((part) => part.type === "timeZoneName");

      if (offsetPart && offsetPart.value) {
        // Format: "GMT+08:00" or "GMT-05:00" -> convert to "GMT+8" or "GMT-5"
        const offsetMatch = offsetPart.value.match(/GMT([+-])(\d{1,2}):\d{2}/);
        if (offsetMatch) {
          const sign = offsetMatch[1];
          const hours = parseInt(offsetMatch[2], 10);
          return `GMT${sign}${hours}`;
        }
      }

      // Fallback: calculate offset by comparing UTC and timezone times
      const utcFormatter = new Intl.DateTimeFormat("en", {
        timeZone: "UTC",
        hour: "2-digit",
        hour12: false,
      });
      const tzFormatter = new Intl.DateTimeFormat("en", {
        timeZone: timezone,
        hour: "2-digit",
        hour12: false,
      });

      const utcHour = parseInt(utcFormatter.format(now), 10);
      const tzHour = parseInt(tzFormatter.format(now), 10);
      let offset = tzHour - utcHour;

      // Handle day boundary crossing
      if (Math.abs(offset) > 12) {
        offset = offset > 0 ? offset - 24 : offset + 24;
      }

      const sign = offset >= 0 ? "+" : "-";
      const hours = Math.abs(offset);
      return `GMT${sign}${hours}`;
    } catch (error) {
      // Fallback: use common timezone mappings
      const timezoneMap = {
        "Asia/Singapore": "GMT+8",
        "Asia/Kolkata": "GMT+5",
        "Asia/Karachi": "GMT+5",
        "Asia/Dhaka": "GMT+6",
        "America/New_York": "GMT-5",
        "America/Chicago": "GMT-6",
        "America/Denver": "GMT-7",
        "America/Los_Angeles": "GMT-8",
        "Europe/London": "GMT+0",
        "Europe/Paris": "GMT+1",
        "Asia/Tokyo": "GMT+9",
        "Australia/Sydney": "GMT+10",
      };
      return timezoneMap[timezone] || "GMT+0";
    }
  }

  /**
   * Generates user initials from name
   * @param {string} name - User's full name
   * @returns {string} Initials (e.g., "John Doe" -> "JD")
   */
  static getInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
