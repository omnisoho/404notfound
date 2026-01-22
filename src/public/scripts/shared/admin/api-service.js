/**
 * API Service Module
 * Single Responsibility: Handle all API communication
 * Follows Interface Segregation: Provides focused API methods
 */

class ApiService {
  constructor(baseUrl = "/api/admin") {
    this.baseUrl = baseUrl;
  }

  /**
   * Gets auth token from storage
   */
  getAuthToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }

  /**
   * Makes authenticated API request
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async request(url, options = {}) {
    const token = this.getAuthToken();
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/auth";
          throw new Error("Unauthorized");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Fetches users with pagination and filters
   */
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`${this.baseUrl}/users?${queryString}`);
  }

  /**
   * Fetches single user by ID
   */
  async getUserById(userId) {
    return this.request(`${this.baseUrl}/users/${userId}`);
  }

  /**
   * Updates user
   */
  async updateUser(userId, updateData) {
    return this.request(`${this.baseUrl}/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Deletes user
   */
  async deleteUser(userId) {
    return this.request(`${this.baseUrl}/users/${userId}`, {
      method: "DELETE",
    });
  }

  /**
   * Resets user password
   */
  async resetUserPassword(userId) {
    return this.request(`${this.baseUrl}/users/${userId}/reset-password`, {
      method: "POST",
    });
  }

  /**
   * Fetches dashboard stats
   */
  async getStats() {
    return this.request(`${this.baseUrl}/stats`);
  }

  /**
   * Fetches analytics data
   */
  async getAnalytics(dateRange = "30d") {
    return this.request(`${this.baseUrl}/analytics?dateRange=${dateRange}`);
  }
}

// Export as singleton
export const apiService = new ApiService();
