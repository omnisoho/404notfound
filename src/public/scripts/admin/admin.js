/**
 * Admin Dashboard JavaScript
 * Handles user management, analytics, and dashboard functionality
 * Follows SOLID principles: Single Responsibility for each function/class
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const API_BASE = "/api/admin";
const USERS_ENDPOINT = `${API_BASE}/users`;
const STATS_ENDPOINT = `${API_BASE}/stats`;
const ANALYTICS_ENDPOINT = `${API_BASE}/analytics`;

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const AdminState = {
  currentPage: 1,
  pageLimit: 20,
  totalPages: 1,
  totalUsers: 0,
  filters: {
    search: "",
    role: "",
    dateRange: "",
  },
  sort: {
    column: "createdAt",
    direction: "desc",
  },
  users: [],
  selectedUsers: new Set(),
  refreshInterval: null,
  autoRefreshEnabled: true,
  charts: {
    userGrowth: null,
    roleDistribution: null,
    personaDistribution: null,
    dailySignups: null,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats date to readable string
 */
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats date to relative time (e.g., "2 days ago")
 */
function formatRelativeTime(dateString) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return formatDate(dateString);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

/**
 * Checks if user was recently active (within last 7 days)
 */
function isRecentlyActive(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

/**
 * Gets initials from name
 */
function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Shows message to user
 */
function showMessage(message, type = "success") {
  if (window.MessageManager) {
    window.MessageManager.show(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

/**
 * Gets auth token from storage
 */
function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Makes authenticated API request
 */
async function apiRequest(url, options = {}) {
  console.log("[apiRequest] Making request to:", url, "with options:", options);
  const token = getAuthToken();
  console.log("[apiRequest] Auth token:", token ? "Present" : "Missing");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  console.log("[apiRequest] Request headers:", headers);
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  console.log(
    "[apiRequest] Response status:",
    response.status,
    response.statusText
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[apiRequest] Error response:", errorData);
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log("[apiRequest] Success response:", data);
  return data;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Fetches users from API with current filters and pagination
 */
async function fetchUsers() {
  try {
    console.log("[fetchUsers] Starting to fetch users...");
    const params = new URLSearchParams({
      page: AdminState.currentPage.toString(),
      limit: AdminState.pageLimit.toString(),
    });

    if (AdminState.filters.search) {
      params.append("search", AdminState.filters.search);
    }
    if (AdminState.filters.role) {
      params.append("role", AdminState.filters.role);
    }
    if (AdminState.filters.dateRange) {
      const dateRange = AdminState.filters.dateRange;
      if (dateRange === "7d") {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        params.append("dateFrom", date.toISOString());
      } else if (dateRange === "30d") {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        params.append("dateFrom", date.toISOString());
      } else if (dateRange === "90d") {
        const date = new Date();
        date.setDate(date.getDate() - 90);
        params.append("dateFrom", date.toISOString());
      }
    }

    if (AdminState.sort.column) {
      params.append("sortBy", AdminState.sort.column);
      params.append("sortOrder", AdminState.sort.direction);
    }

    console.log("[fetchUsers] Requesting:", `${USERS_ENDPOINT}?${params}`);
    const data = await apiRequest(`${USERS_ENDPOINT}?${params}`);
    console.log("[fetchUsers] Received data:", data);

    AdminState.users = data.users || [];

    // Fix: pagination data is nested under 'pagination' object
    if (data.pagination) {
      AdminState.totalPages = data.pagination.totalPages || 1;
      AdminState.totalUsers = data.pagination.total || 0;
    } else {
      // Fallback for flat structure
      AdminState.totalPages = data.totalPages || 1;
      AdminState.totalUsers = data.total || 0;
    }

    console.log(
      "[fetchUsers] Updated AdminState - users:",
      AdminState.users.length,
      "totalUsers:",
      AdminState.totalUsers
    );

    renderUsersTable();
    updatePagination();
    console.log("[fetchUsers] Completed rendering and pagination update");
  } catch (error) {
    console.error("Error fetching users:", error);
    renderUsersTableError();
    showMessage("Failed to load users", "error");
  }
}

function handleColumnSort(column) {
  const previousColumn = AdminState.sort.column;
  const previousDirection = AdminState.sort.direction;

  if (AdminState.sort.column === column) {
    AdminState.sort.direction =
      AdminState.sort.direction === "asc" ? "desc" : "asc";
  } else {
    AdminState.sort.column = column;
    AdminState.sort.direction = "asc";
  }

  updateSortIndicators();
  fetchUsers();
}

function updateSortIndicators() {
  document.querySelectorAll(".sort-indicator").forEach((el) => el.remove());

  document
    .querySelectorAll(".notion-table-view-header-cell")
    .forEach((cell) => {
      const sortColumn = cell.getAttribute("data-sort-column");
      if (!sortColumn) return;

      const contentDiv = cell.querySelector(
        ".notion-table-view-header-cell-content"
      );
      if (!contentDiv) return;

      if (sortColumn === AdminState.sort.column) {
        const indicator = document.createElement("div");
        indicator.className = "sort-indicator";
        indicator.innerHTML =
          AdminState.sort.direction === "asc"
            ? '<svg viewBox="0 0 14 14"><path d="M3.5 9L7 5.5L10.5 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg viewBox="0 0 14 14"><path d="M3.5 5L7 8.5L10.5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        contentDiv.appendChild(indicator);
      }
    });
}

/**
 * Renders users table with new design
 */
function renderUsersTable() {
  const container = document.getElementById("usersTableBody");
  if (!container) return;

  if (AdminState.users.length === 0) {
    container.innerHTML = `
      <div class="notion-table-view-row" style="height: auto; min-height: 120px;">
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 3rem;">
          <i data-lucide="users" style="width: 2.5rem; height: 2.5rem; color: var(--muted); opacity: 0.5;"></i>
          <p style="color: var(--muted); font-size: 14px;">No users found</p>
        </div>
      </div>
    `;
    if (window.lucide?.createIcons) window.lucide.createIcons();
    return;
  }

  container.innerHTML = AdminState.users
    .map(
      (user, index) => `
      <div class="notion-table-view-row user-row" data-user-id="${
        user.id
      }" data-index="${index}" style="animation-delay: ${index * 0.02}s;">
        <!-- Sticky Checkbox Cell -->
        <div class="notion-table-view-checkbox-column">
          <div class="notion-table-view-checkbox-wrapper">
            <div class="notion-table-view-checkbox-input ${
              AdminState.selectedUsers.has(user.id) ? "checked" : ""
            }" onclick="event.stopPropagation(); toggleUserSelection('${
        user.id
      }')">
              <input type="checkbox" ${
                AdminState.selectedUsers.has(user.id) ? "checked" : ""
              } />
              <div class="notion-table-view-checkbox-checkmark">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
                  <path d="M4 8l2.5 2.5L12 5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Name Cell -->
        <div class="notion-table-view-cell" style="width: 200px;">
          <div class="notion-table-view-cell-content">
            <div class="notion-table-view-cell-inner" onclick="editUser('${
              user.id
            }')">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 18px; height: 18px; border-radius: 3px; background: linear-gradient(135deg, var(--navy) 0%, #4a7ab0 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="color: white; font-size: 9px; font-weight: 600;">${getInitials(
                    user.name
                  )}</span>
                </div>
                <span style="font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
                  user.name || "Unnamed"
                )}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Email Cell -->
        <div class="notion-table-view-cell" style="width: 220px;">
          <div class="notion-table-view-cell-content">
            <div class="notion-table-view-cell-inner readonly">
              <span style="color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${escapeHtml(
                user.email
              )}</span>
            </div>
          </div>
        </div>

        <!-- Role Cell -->
        <div class="notion-table-view-cell" style="width: 100px;">
          <div class="notion-table-view-cell-content">
            <div class="notion-table-view-cell-inner readonly">
              <span class="role-badge ${user.userRole || "user"}">${escapeHtml(
        user.userRole || "user"
      )}</span>
            </div>
          </div>
        </div>

        <!-- Joined Cell -->
        <div class="notion-table-view-cell" style="width: 140px;">
          <div class="notion-table-view-cell-content">
            <div class="notion-table-view-cell-inner readonly">
              <span style="font-size: 12px; color: var(--muted);">${formatDate(
                user.createdAt
              )}</span>
            </div>
          </div>
        </div>

        <!-- Status Cell -->
        <div class="notion-table-view-cell" style="width: 100px;">
          <div class="notion-table-view-cell-content">
            <div class="notion-table-view-cell-inner readonly">
              <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${
                  isRecentlyActive(user.lastActiveAt) ? "#10B981" : "#9CA3AF"
                }; flex-shrink: 0;"></div>
                <span style="font-size: 11px; color: ${
                  isRecentlyActive(user.lastActiveAt)
                    ? "#10B981"
                    : "var(--muted)"
                };">${
        isRecentlyActive(user.lastActiveAt) ? "Active" : "Inactive"
      }</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Updated Cell -->
        <div class="notion-table-view-cell" style="width: 120px;">
          <div class="notion-table-view-cell-content">
            <div class="notion-table-view-cell-inner readonly">
              <span style="font-size: 12px; color: var(--muted);">${formatRelativeTime(
                user.updatedAt || user.lastActiveAt
              )}</span>
            </div>
          </div>
        </div>

        <!-- Trips Cell -->
        <div class="notion-table-view-cell" style="width: 80px;">
          <div class="notion-table-view-cell-content">
            <div class="notion-table-view-cell-inner readonly" style="justify-content: center;">
              <span style="font-size: 12px; color: var(--ink);">${
                user._count?.tripsCreated ?? 0
              }</span>
            </div>
          </div>
        </div>

        <!-- Provider Cell -->
        <div class="notion-table-view-cell" style="width: 90px;">
          <div class="notion-table-view-cell-content">
            <div class="notion-table-view-cell-inner readonly">
              <span class="provider-badge ${
                user.authProvider || "local"
              }">${escapeHtml(user.authProvider || "local")}</span>
            </div>
          </div>
        </div>

        <!-- Actions Cell -->
        <div class="notion-table-view-cell" style="flex-grow: 1; min-width: 120px;">
          <div class="notion-table-view-cell-content">
            <div class="notion-table-view-cell-inner readonly" style="display: flex; align-items: center; justify-content: center; gap: 2px; padding: 0 4px;">
              <button onclick="event.stopPropagation(); editUser('${
                user.id
              }')" class="notion-action-btn" title="Edit user">
                <i data-lucide="pencil" style="width: 12px; height: 12px;"></i>
              </button>
              <button onclick="event.stopPropagation(); resetUserPassword('${
                user.id
              }')" class="notion-action-btn" title="Reset password">
                <i data-lucide="key" style="width: 12px; height: 12px;"></i>
              </button>
              <button onclick="event.stopPropagation(); deleteUser('${
                user.id
              }')" class="notion-action-btn danger" title="Delete user">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `
    )
    .join("");

  if (window.lucide?.createIcons) window.lucide.createIcons();
  updateSortIndicators();
}

/**
 * Renders error state for users table
 */
function renderUsersTableError() {
  const container = document.getElementById("usersTableBody");
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; width: 100%; border-bottom: 1px solid var(--border); padding: 3rem 0;">
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;">
        <i data-lucide="alert-circle" style="width: 3rem; height: 3rem; color: #ef4444;"></i>
        <p style="color: var(--muted); font-size: 0.875rem;">Failed to load users</p>
        <button onclick="fetchUsers()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: var(--navy); color: white; border: none; cursor: pointer; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;">
          Retry
        </button>
      </div>
    </div>
  `;
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/**
 * Updates pagination UI
 */
function updatePagination() {
  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  if (pageInfo) {
    pageInfo.textContent = `Page ${AdminState.currentPage} of ${AdminState.totalPages} (${AdminState.totalUsers} users)`;
  }

  if (prevBtn) {
    prevBtn.disabled = AdminState.currentPage <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = AdminState.currentPage >= AdminState.totalPages;
  }

  // Update pagination count display (Showing X to Y of Z users)
  const paginationStart = document.getElementById("paginationStart");
  const paginationEnd = document.getElementById("paginationEnd");
  const paginationTotal = document.getElementById("paginationTotal");

  if (paginationStart && paginationEnd && paginationTotal) {
    const start =
      AdminState.totalUsers === 0
        ? 0
        : (AdminState.currentPage - 1) * AdminState.pageLimit + 1;
    const end = Math.min(
      AdminState.currentPage * AdminState.pageLimit,
      AdminState.totalUsers
    );

    paginationStart.textContent = start;
    paginationEnd.textContent = end;
    paginationTotal.textContent = AdminState.totalUsers;
  }
}

/**
 * Toggles user selection
 */
window.toggleUserSelection = function toggleUserSelection(userId) {
  if (AdminState.selectedUsers.has(userId)) {
    AdminState.selectedUsers.delete(userId);
  } else {
    AdminState.selectedUsers.add(userId);
  }
  updateBulkActionsBar();

  // Update checkbox state in Notion-style table
  const row = document.querySelector(`.user-row[data-user-id="${userId}"]`);
  if (row) {
    const checkboxContainer = row.querySelector(
      ".notion-table-view-checkbox-input"
    );
    const checkbox = row.querySelector(
      '.notion-table-view-checkbox-input input[type="checkbox"]'
    );
    if (AdminState.selectedUsers.has(userId)) {
      checkboxContainer?.classList.add("checked");
      if (checkbox) checkbox.checked = true;
    } else {
      checkboxContainer?.classList.remove("checked");
      if (checkbox) checkbox.checked = false;
    }
  }

  // Update select all checkbox state
  updateSelectAllCheckbox();
};

/**
 * Toggles selection for all users on the current page
 */
window.toggleSelectAll = function toggleSelectAll() {
  const userRows = document.querySelectorAll(".user-row");
  const selectAllCheckbox = document.getElementById("selectAllCheckboxInput");
  const selectAllContainer = document.getElementById("selectAllCheckbox");

  // Determine if we should select all or deselect all
  const allSelected =
    AdminState.users.length > 0 &&
    AdminState.users.every((user) => AdminState.selectedUsers.has(user.id));

  if (allSelected) {
    // Deselect all
    AdminState.selectedUsers.clear();
    userRows.forEach((row) => {
      const checkboxInput = row.querySelector(
        ".notion-table-view-checkbox-input"
      );
      if (checkboxInput) checkboxInput.classList.remove("checked");
      const checkbox = row.querySelector(
        '.notion-table-view-checkbox-input input[type="checkbox"]'
      );
      if (checkbox) checkbox.checked = false;
    });
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    if (selectAllContainer) selectAllContainer.classList.remove("checked");
  } else {
    // Select all
    AdminState.users.forEach((user) => AdminState.selectedUsers.add(user.id));
    userRows.forEach((row) => {
      const checkboxInput = row.querySelector(
        ".notion-table-view-checkbox-input"
      );
      if (checkboxInput) checkboxInput.classList.add("checked");
      const checkbox = row.querySelector(
        '.notion-table-view-checkbox-input input[type="checkbox"]'
      );
      if (checkbox) checkbox.checked = true;
    });
    if (selectAllCheckbox) selectAllCheckbox.checked = true;
    if (selectAllContainer) selectAllContainer.classList.add("checked");
  }

  updateBulkActionsBar();
};

/**
 * Updates the select all checkbox based on current selections
 */
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById("selectAllCheckboxInput");
  const selectAllContainer = document.getElementById("selectAllCheckbox");

  if (!selectAllCheckbox || AdminState.users.length === 0) return;

  const selectedCount = AdminState.selectedUsers.size;
  const totalCount = AdminState.users.length;
  const allChecked = selectedCount === totalCount && totalCount > 0;
  const someChecked = selectedCount > 0 && selectedCount < totalCount;

  selectAllCheckbox.checked = allChecked;
  selectAllCheckbox.indeterminate = someChecked;

  if (allChecked) {
    selectAllContainer?.classList.add("checked");
  } else {
    selectAllContainer?.classList.remove("checked");
  }
}

/**
 * Updates bulk actions bar visibility and count
 */
function updateBulkActionsBar() {
  const bar = document.getElementById("bulkActionsBar");
  const countSpan = document.getElementById("selectedCount");

  if (!bar || !countSpan) return;

  const count = AdminState.selectedUsers.size;

  if (count > 0) {
    bar.classList.remove("hidden");
    countSpan.textContent = `${count} ${
      count === 1 ? "user" : "users"
    } selected`;
    requestAnimationFrame(() => {
      bar.style.opacity = "1";
      bar.style.maxHeight = "100px";
      bar.style.transform = "translateY(0)";
      bar.style.marginTop = "1.5rem";
      bar.style.paddingTop = "12px";
    });
  } else {
    bar.style.opacity = "0";
    bar.style.maxHeight = "0";
    bar.style.transform = "translateY(-12px)";
    bar.style.marginTop = "0";
    bar.style.paddingTop = "0";
    setTimeout(() => {
      bar.classList.add("hidden");
    }, 200);
  }
}

/**
 * Clears all user selections
 */
function clearSelection() {
  AdminState.selectedUsers.clear();
  updateBulkActionsBar();

  // Uncheck all checkboxes in Notion-style table
  document.querySelectorAll(".user-row").forEach((row) => {
    const checkboxContainer = row.querySelector(
      ".notion-table-view-checkbox-input"
    );
    const checkbox = row.querySelector(
      '.notion-table-view-checkbox-input input[type="checkbox"]'
    );
    checkboxContainer?.classList.remove("checked");
    if (checkbox) checkbox.checked = false;
  });

  // Also clear the select all checkbox
  const selectAllCheckbox = document.getElementById("selectAllCheckboxInput");
  const selectAllContainer = document.getElementById("selectAllCheckbox");
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  if (selectAllContainer) selectAllContainer.classList.remove("checked");
}

/**
 * Bulk delete selected users
 */
async function bulkDeleteUsers() {
  const count = AdminState.selectedUsers.size;
  if (count === 0) return;

  if (
    !confirm(
      `Are you sure you want to delete ${count} user(s)? This action cannot be undone.`
    )
  ) {
    return;
  }

  try {
    const deletePromises = Array.from(AdminState.selectedUsers).map((userId) =>
      apiRequest(`${USERS_ENDPOINT}/${userId}`, { method: "DELETE" })
    );

    await Promise.all(deletePromises);
    showMessage(`Successfully deleted ${count} user(s)`, "success");
    clearSelection();
    fetchUsers();
    fetchStats();
  } catch (error) {
    console.error("Error bulk deleting users:", error);
    showMessage("Failed to delete some users", "error");
  }
}

/**
 * Bulk reset passwords for selected users
 */
async function bulkResetPasswords() {
  const count = AdminState.selectedUsers.size;
  if (count === 0) return;

  if (!confirm(`Reset passwords for ${count} user(s)?`)) {
    return;
  }

  try {
    const results = [];
    for (const userId of AdminState.selectedUsers) {
      try {
        const result = await apiRequest(
          `${USERS_ENDPOINT}/${userId}/reset-password`,
          {
            method: "POST",
          }
        );
        results.push({
          userId,
          success: true,
          password: result.temporaryPassword,
        });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    showMessage(
      `Reset passwords for ${successCount}/${count} users`,
      successCount === count ? "success" : "warning"
    );
    clearSelection();
  } catch (error) {
    console.error("Error bulk resetting passwords:", error);
    showMessage("Failed to reset passwords", "error");
  }
}

// ============================================================================
// USER ACTIONS
// ============================================================================

/**
 * Updates the role dropdown display to match the given role
 */
function updateRoleDropdownDisplay(role) {
  const roleDropdownSelected = document.getElementById("roleDropdownSelected");
  const roleDropdown = document.getElementById("roleDropdown");
  const editUserRoleInput = document.getElementById("editUserRole");

  if (!roleDropdownSelected || !roleDropdown || !editUserRoleInput) return;

  // Update hidden input
  editUserRoleInput.value = role;

  // Update selected display
  const roleLabels = {
    user: "User",
    admin: "Admin",
    premium: "Premium",
  };
  roleDropdownSelected.innerHTML = `<span class="role-selector-badge ${role}">${
    roleLabels[role] || role
  }</span>`;

  // Update selected state in dropdown
  roleDropdown
    .querySelectorAll(".custom-role-selector-option")
    .forEach((opt) => {
      opt.classList.toggle("selected", opt.dataset.role === role);
    });
}

/**
 * Opens edit user modal
 */
async function editUser(userId) {
  try {
    console.log("[editUser] Fetching user:", userId);
    const response = await apiRequest(`${USERS_ENDPOINT}/${userId}`);
    // API returns { success: true, user: {...} }
    const user = response.user || response;
    console.log("[editUser] User data received:", user);

    const nameInput = document.getElementById("editUserName");
    const emailInput = document.getElementById("editUserEmail");
    const userIdInput = document.getElementById("editUserId");

    console.log("[editUser] Input elements found:", {
      nameInput: !!nameInput,
      emailInput: !!emailInput,
      userIdInput: !!userIdInput,
    });

    if (userIdInput) userIdInput.value = user.id;
    if (nameInput) nameInput.value = user.name || "";
    if (emailInput) emailInput.value = user.email || "";

    // Update role dropdown
    const role = user.userRole || "user";
    updateRoleDropdownDisplay(role);

    const modal = document.getElementById("editUserModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    requestAnimationFrame(() => {
      modal.classList.add("show");
    });

    // Reinitialize icons
    if (window.lucide?.createIcons) window.lucide.createIcons();
  } catch (error) {
    console.error("Error fetching user:", error);
    showMessage("Failed to load user details", "error");
  }
}

/**
 * Opens delete user confirmation modal
 */
function deleteUser(userId) {
  const user = AdminState.users.find((u) => u.id === userId);
  if (!user) return;

  document.getElementById("deleteUserId").value = userId;
  document.getElementById("deleteUserName").textContent =
    user.name || user.email;

  const modal = document.getElementById("deleteUserModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  requestAnimationFrame(() => {
    modal.classList.add("show");
  });
}

/**
 * Confirms user deletion
 */
async function confirmDeleteUser() {
  const userId = document.getElementById("deleteUserId").value;
  if (!userId) return;

  try {
    await apiRequest(`${USERS_ENDPOINT}/${userId}`, { method: "DELETE" });
    showMessage("User deleted successfully", "success");
    closeDeleteUserModal();
    fetchUsers();
    fetchStats();
  } catch (error) {
    console.error("Error deleting user:", error);
    showMessage("Failed to delete user: " + error.message, "error");
  }
}

/**
 * Closes delete user modal
 */
function closeDeleteUserModal() {
  const modal = document.getElementById("deleteUserModal");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }, 250);
}

/**
 * Resets user password
 */
async function resetUserPassword(userId) {
  if (
    !confirm(
      "Reset this user's password? They will receive a temporary password."
    )
  ) {
    return;
  }

  try {
    const data = await apiRequest(
      `${USERS_ENDPOINT}/${userId}/reset-password`,
      {
        method: "POST",
      }
    );

    document.getElementById("temporaryPasswordDisplay").value =
      data.temporaryPassword || "";
    const modal = document.getElementById("resetPasswordModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    requestAnimationFrame(() => {
      modal.classList.add("show");
    });
    if (window.lucide?.createIcons) window.lucide.createIcons();
  } catch (error) {
    console.error("Error resetting password:", error);
    showMessage("Failed to reset password: " + error.message, "error");
  }
}

/**
 * Closes reset password modal
 */
function closeResetPasswordModal() {
  const modal = document.getElementById("resetPasswordModal");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }, 250);
}

// ============================================================================
// STATS DASHBOARD
// ============================================================================

/**
 * Fetches and displays dashboard stats with smooth animations
 */
async function fetchStats() {
  try {
    const data = await apiRequest(STATS_ENDPOINT);
    const stats = data.stats || {};

    animateStatUpdate("statTotalUsers", stats.totalUsers || 0);
    animateStatUpdate("statActiveUsers", stats.activeUsersLast30Days || 0);
    animateStatUpdate("statTotalTrips", stats.totalTrips || 0);
    animateStatUpdate("statQuizCompletions", stats.quizCompletions || 0);

    updatePlatformStats(stats);
    fetchRecentUsers();
    checkSystemHealth();
  } catch (error) {
    console.error("Error fetching stats:", error);
    showMessage("Failed to load statistics", "error");
  }
}

/**
 * Fetches and displays recent users on the overview tab
 */
async function fetchRecentUsers() {
  try {
    const data = await apiRequest(
      `${USERS_ENDPOINT}?limit=5&sortBy=createdAt&sortOrder=desc`
    );
    const container = document.getElementById("recentUsersContainer");
    if (!container) return;

    const users = data.users || [];

    if (users.length === 0) {
      container.innerHTML = `
        <div class="flex items-center justify-center py-12 text-muted">
          <p>No users yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = users
      .map(
        (user) => `
        <div class="flex items-center gap-4 border-b border-border py-4 last:border-0 last:pb-0">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-navy bg-navy">
            <span class="text-xs font-semibold text-sheet">${getInitials(
              user.name
            )}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${escapeHtml(
              user.name || "Unnamed"
            )}</p>
            <p class="text-xs text-muted">${formatRelativeTime(
              user.createdAt
            )}</p>
          </div>
          <span class="inline-flex items-center rounded border border-border bg-sheet px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">${escapeHtml(
            user.userRole || "user"
          )}</span>
        </div>
      `
      )
      .join("");
  } catch (error) {
    console.error("Error fetching recent users:", error);
    const container = document.getElementById("recentUsersContainer");
    if (container) {
      container.innerHTML = `
        <div class="flex items-center justify-center py-12 text-red-500">
          <p>Failed to load users</p>
        </div>
      `;
    }
  }
}

/**
 * Animates stat number updates with counting effect
 */
function animateStatUpdate(elementId, targetValue) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const startValue = parseInt(element.textContent.replace(/[^0-9]/g, "")) || 0;
  const duration = 800;
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(
      startValue + (targetValue - startValue) * easeProgress
    );

    element.textContent = currentValue.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * Updates platform stats in the sidebar
 */
function updatePlatformStats(stats) {
  const avgTrips =
    stats.totalUsers > 0 ? (stats.totalTrips / stats.totalUsers).toFixed(1) : 0;

  const avgTripsEl = document.getElementById("statAvgTrips");
  if (avgTripsEl) avgTripsEl.textContent = avgTrips;

  const newTodayEl = document.getElementById("statNewToday");
  if (newTodayEl) newTodayEl.textContent = stats.newUsersToday || 0;

  const totalPersonasEl = document.getElementById("statTotalPersonas");
  if (totalPersonasEl) totalPersonasEl.textContent = stats.totalPersonas || 0;
}

/**
 * Checks system health and updates status indicators
 */
async function checkSystemHealth() {
  console.log("[checkSystemHealth] Starting system health check...");
  const statusItems = [
    { id: "Database", endpoint: STATS_ENDPOINT, requiresAuth: true },
    { id: "API", endpoint: STATS_ENDPOINT, requiresAuth: true },
    { id: "Auth", endpoint: "/auth/check", requiresAuth: false },
  ];

  for (const item of statusItems) {
    const dotEl = document.getElementById(`status${item.id}`);
    const textEl = document.getElementById(`status${item.id}Text`);

    if (!dotEl || !textEl) {
      console.warn(`[checkSystemHealth] Elements not found for ${item.id}`);
      continue;
    }

    try {
      const headers = {};
      if (item.requiresAuth) {
        const token = getAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      console.log(
        `[checkSystemHealth] Checking ${item.id} at ${item.endpoint}...`
      );
      const response = await fetch(item.endpoint, {
        headers,
        credentials: "include",
      });

      console.log(
        `[checkSystemHealth] ${item.id} response:`,
        response.status,
        response.statusText
      );

      if (response.ok) {
        setSystemStatus(dotEl, textEl, "operational");
      } else if (response.status === 401 || response.status === 403) {
        // Auth issues don't mean the service is down
        setSystemStatus(dotEl, textEl, "operational");
      } else {
        setSystemStatus(dotEl, textEl, "degraded");
      }
    } catch (error) {
      console.error(`[checkSystemHealth] ${item.id} check failed:`, error);
      setSystemStatus(dotEl, textEl, "down");
    }
  }
  console.log("[checkSystemHealth] System health check completed");
}

/**
 * Helper to set system status indicator
 */
function setSystemStatus(dotEl, textEl, status) {
  const statuses = {
    operational: {
      color: "#10B981",
      text: "Operational",
      shadow: "rgba(16, 185, 129, 0.12)",
    },
    degraded: {
      color: "#F59E0B",
      text: "Degraded",
      shadow: "rgba(245, 158, 11, 0.12)",
    },
    down: {
      color: "#EF4444",
      text: "Down",
      shadow: "rgba(239, 68, 68, 0.12)",
    },
  };

  const config = statuses[status] || statuses.down;
  dotEl.style.background = config.color;
  dotEl.style.boxShadow = `0 0 0 3px ${config.shadow}`;
  textEl.textContent = config.text;
  textEl.style.color = config.color;
}

// ============================================================================
// ANALYTICS & CHARTS (REMOVED)
// ============================================================================
// Analytics functionality has been removed as it was dead code.
// The analytics UI elements have been removed from admin.html.
// If analytics are needed in the future, implement them with proper backend support.

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handles column sorting
 */
window.handleSort = function handleSort(column) {
  if (AdminState.sort.column === column) {
    AdminState.sort.direction =
      AdminState.sort.direction === "asc" ? "desc" : "asc";
  } else {
    AdminState.sort.column = column;
    AdminState.sort.direction = "asc";
  }

  AdminState.currentPage = 1;
  updateSortIndicators();
  fetchUsers();
};

/**
 * Handles filter application
 */
function handleApplyFilters() {
  const searchInput = document.getElementById("userSearch");
  const roleFilter = document.getElementById("userRoleFilter");
  const dateFilter = document.getElementById("userDateFilter");

  if (searchInput) AdminState.filters.search = searchInput.value.trim();
  if (roleFilter) AdminState.filters.role = roleFilter.value;
  if (dateFilter) AdminState.filters.dateRange = dateFilter.value;

  AdminState.currentPage = 1;
  renderFilterPills();
  fetchUsers();
}

/**
 * Handles filter reset
 */
function handleResetFilters() {
  AdminState.filters = { search: "", role: "", dateRange: "" };

  const searchInput = document.getElementById("userSearch");
  const roleFilter = document.getElementById("userRoleFilter");
  const dateFilter = document.getElementById("userDateFilter");

  if (searchInput) searchInput.value = "";
  if (roleFilter) roleFilter.value = "";
  if (dateFilter) dateFilter.value = "";

  AdminState.currentPage = 1;
  renderFilterPills();
  fetchUsers();
}

/**
 * Renders active filter pills
 */
function renderFilterPills() {
  const container = document.getElementById("activeFiltersContainer");
  if (!container) return;

  const filters = [];

  if (AdminState.filters.search) {
    filters.push({
      type: "search",
      label: "Name",
      value: AdminState.filters.search,
      display: `Name: ${escapeHtml(AdminState.filters.search)}`,
    });
  }

  if (AdminState.filters.role) {
    const roleLabels = { user: "User", admin: "Admin", premium: "Premium" };
    filters.push({
      type: "role",
      label: "Role",
      value: AdminState.filters.role,
      display: `Role: ${
        roleLabels[AdminState.filters.role] || AdminState.filters.role
      }`,
    });
  }

  if (AdminState.filters.dateRange) {
    const dateLabels = {
      "7d": "Last 7 days",
      "30d": "Last 30 days",
      "90d": "Last 90 days",
    };
    filters.push({
      type: "dateRange",
      label: "Date",
      value: AdminState.filters.dateRange,
      display:
        dateLabels[AdminState.filters.dateRange] ||
        AdminState.filters.dateRange,
    });
  }

  if (filters.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = filters
    .map(
      (filter) => `
      <span class="filter-pill" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: var(--canvas); border: 1px solid var(--border); font-size: 12px; color: var(--ink);">
        ${filter.display}
        <button onclick="removeFilter('${filter.type}')" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center;">
          <i data-lucide="x" style="width: 12px; height: 12px; color: var(--muted);"></i>
        </button>
      </span>
    `
    )
    .join("");

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/**
 * Removes a specific filter
 */
window.removeFilter = function removeFilter(filterType) {
  if (filterType === "search") {
    AdminState.filters.search = "";
    const searchInput = document.getElementById("userSearch");
    if (searchInput) searchInput.value = "";
  } else if (filterType === "role") {
    AdminState.filters.role = "";
    const roleFilter = document.getElementById("userRoleFilter");
    if (roleFilter) roleFilter.value = "";
  } else if (filterType === "dateRange") {
    AdminState.filters.dateRange = "";
    const dateFilter = document.getElementById("userDateFilter");
    if (dateFilter) dateFilter.value = "";
  }

  AdminState.currentPage = 1;
  renderFilterPills();
  fetchUsers();
};

/**
 * Handles pagination
 */
function handlePreviousPage() {
  if (AdminState.currentPage > 1) {
    AdminState.currentPage--;
    fetchUsers();
  }
}

function handleNextPage() {
  if (AdminState.currentPage < AdminState.totalPages) {
    AdminState.currentPage++;
    fetchUsers();
  }
}

/**
 * Handles edit user form submission
 */
async function handleEditUserSubmit(e) {
  e.preventDefault();

  const userId = document.getElementById("editUserId").value;
  const updateData = {
    name: document.getElementById("editUserName").value,
    email: document.getElementById("editUserEmail").value,
    userRole: document.getElementById("editUserRole").value,
  };

  try {
    await apiRequest(`${USERS_ENDPOINT}/${userId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    showMessage("User updated successfully", "success");

    const modal = document.getElementById("editUserModal");
    modal.classList.remove("show");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 250);

    fetchUsers();
    fetchStats();
  } catch (error) {
    console.error("Error updating user:", error);
    showMessage("Failed to update user: " + error.message, "error");
  }
}

/**
 * Starts auto-refresh for dashboard stats
 */
function startAutoRefresh() {
  if (AdminState.refreshInterval) {
    clearInterval(AdminState.refreshInterval);
  }

  if (!AdminState.autoRefreshEnabled) return;

  AdminState.refreshInterval = setInterval(() => {
    const overviewTab = document.querySelector('[data-tab="overview"]');
    const isOverviewActive =
      overviewTab?.getAttribute("aria-selected") === "true";

    if (isOverviewActive) {
      fetchStats();
    }
  }, 30000);
}

/**
 * Stops auto-refresh
 */
function stopAutoRefresh() {
  if (AdminState.refreshInterval) {
    clearInterval(AdminState.refreshInterval);
    AdminState.refreshInterval = null;
  }
}

/**
 * Toggles auto-refresh on/off
 */
window.toggleAutoRefresh = function toggleAutoRefresh() {
  AdminState.autoRefreshEnabled = !AdminState.autoRefreshEnabled;

  if (AdminState.autoRefreshEnabled) {
    startAutoRefresh();
    showMessage("Auto-refresh enabled", "success");
  } else {
    stopAutoRefresh();
    showMessage("Auto-refresh disabled", "info");
  }

  updateAutoRefreshButton();
};

/**
 * Updates auto-refresh button visual state
 */
function updateAutoRefreshButton() {
  const btn = document.getElementById("autoRefreshBtn");
  if (!btn) return;

  if (AdminState.autoRefreshEnabled) {
    btn.classList.add("active");
    btn.title = "Auto-refresh enabled (click to disable)";
  } else {
    btn.classList.remove("active");
    btn.title = "Auto-refresh disabled (click to enable)";
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes custom role selector dropdown
 */
function initializeRoleSelector() {
  const roleSelects = document.querySelectorAll(".custom-role-select");
  roleSelects.forEach((select) => {
    // Custom dropdown initialization if needed
  });
}

/**
 * Initializes admin dashboard
 */
function initializeAdminDashboard() {
  console.log("Initializing admin dashboard...");

  initializeRoleSelector();
  fetchStats();
  startAutoRefresh();

  // Setup event listeners
  const userSearchInput = document.getElementById("userSearch");
  if (userSearchInput) {
    let searchTimeout;
    userSearchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        handleApplyFilters();
      }, 300);
    });
  }

  document
    .getElementById("userRoleFilter")
    ?.addEventListener("change", handleApplyFilters);
  document
    .getElementById("userDateFilter")
    ?.addEventListener("change", handleApplyFilters);

  // Add Filter button - show/hide dropdown
  const addFilterBtn = document.getElementById("addFilterBtn");
  const filterDropdown = document.getElementById("filterDropdown");
  if (addFilterBtn && filterDropdown) {
    document.body.appendChild(filterDropdown);

    addFilterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden =
        filterDropdown.style.display === "none" ||
        filterDropdown.style.display === "";

      if (isHidden) {
        const rect = addFilterBtn.getBoundingClientRect();
        filterDropdown.style.top = rect.bottom + window.scrollY + 4 + "px";
        filterDropdown.style.left = rect.left + window.scrollX + "px";
        filterDropdown.style.display = "block";
        filterDropdown.classList.remove("hidden");

        requestAnimationFrame(() => {
          filterDropdown.style.opacity = "1";
          filterDropdown.style.transform = "translateY(0) scale(1)";
          filterDropdown.style.pointerEvents = "auto";
        });
      } else {
        filterDropdown.style.opacity = "0";
        filterDropdown.style.transform = "translateY(-4px) scale(0.98)";
        filterDropdown.style.pointerEvents = "none";
        setTimeout(() => {
          filterDropdown.style.display = "none";
          filterDropdown.classList.add("hidden");
        }, 200);
      }

      if (window.lucide?.createIcons && isHidden) {
        setTimeout(() => window.lucide.createIcons(), 0);
      }
    });

    document.addEventListener("click", (e) => {
      if (
        !addFilterBtn.contains(e.target) &&
        !filterDropdown.contains(e.target)
      ) {
        filterDropdown.style.opacity = "0";
        filterDropdown.style.transform = "translateY(-4px) scale(0.98)";
        filterDropdown.style.pointerEvents = "none";
        setTimeout(() => {
          filterDropdown.style.display = "none";
          filterDropdown.classList.add("hidden");
        }, 200);
      }
    });

    filterDropdown.querySelectorAll(".filter-dropdown-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const filterType = item.dataset.filterType;

        if (filterType === "role") {
          const roleValue = item.dataset.roleValue;
          document.getElementById("userRoleFilter").value = roleValue;
          AdminState.filters.role = roleValue;
        } else if (filterType === "dateRange") {
          const dateValue = item.dataset.dateValue;
          document.getElementById("userDateFilter").value = dateValue;
          AdminState.filters.dateRange = dateValue;
        }

        filterDropdown.style.opacity = "0";
        filterDropdown.style.transform = "translateY(-4px) scale(0.98)";
        filterDropdown.style.pointerEvents = "none";
        setTimeout(() => {
          filterDropdown.style.display = "none";
          filterDropdown.classList.add("hidden");
        }, 200);

        AdminState.currentPage = 1;
        renderFilterPills();
        fetchUsers();
      });
    });
  }

  document
    .getElementById("prevPageBtn")
    ?.addEventListener("click", handlePreviousPage);
  document
    .getElementById("nextPageBtn")
    ?.addEventListener("click", handleNextPage);

  // Role Dropdown
  const roleDropdownButton = document.getElementById("roleDropdownButton");
  const roleDropdown = document.getElementById("roleDropdown");

  if (roleDropdownButton && roleDropdown) {
    roleDropdownButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      roleDropdown.classList.toggle("show");
    });

    roleDropdown
      .querySelectorAll(".custom-role-selector-option")
      .forEach((option) => {
        option.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const role = option.dataset.role;
          updateRoleDropdownDisplay(role);
          roleDropdown.classList.remove("show");
        });
      });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !roleDropdownButton.contains(e.target) &&
        !roleDropdown.contains(e.target)
      ) {
        roleDropdown.classList.remove("show");
      }
    });
  }

  // Edit User Modal
  document
    .getElementById("editUserForm")
    ?.addEventListener("submit", handleEditUserSubmit);
  document.getElementById("cancelEditUser")?.addEventListener("click", () => {
    const modal = document.getElementById("editUserModal");
    modal.classList.remove("show");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 250);
  });
  document
    .getElementById("closeEditUserModal")
    ?.addEventListener("click", () => {
      const modal = document.getElementById("editUserModal");
      modal.classList.remove("show");
      setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }, 250);
    });

  // Delete User Modal
  document
    .getElementById("confirmDeleteUser")
    ?.addEventListener("click", confirmDeleteUser);
  document
    .getElementById("cancelDeleteUser")
    ?.addEventListener("click", closeDeleteUserModal);
  document
    .getElementById("closeDeleteUserModal")
    ?.addEventListener("click", closeDeleteUserModal);

  // Reset Password Modal
  document
    .getElementById("closeResetPasswordModal")
    ?.addEventListener("click", closeResetPasswordModal);
  document
    .getElementById("closeResetPasswordModalBtn")
    ?.addEventListener("click", closeResetPasswordModal);

  // Copy password button
  document.getElementById("copyPassword")?.addEventListener("click", () => {
    const passwordInput = document.getElementById("temporaryPasswordDisplay");
    if (passwordInput && passwordInput.value) {
      navigator.clipboard.writeText(passwordInput.value).then(() => {
        showMessage("Password copied to clipboard", "success");
      });
    }
  });

  // Bulk Actions
  document
    .getElementById("bulkDeleteBtn")
    ?.addEventListener("click", bulkDeleteUsers);
  document
    .getElementById("bulkResetPasswordBtn")
    ?.addEventListener("click", bulkResetPasswords);
  document
    .getElementById("clearSelectionBtn")
    ?.addEventListener("click", clearSelection);

  // Close modals on backdrop click
  document.getElementById("editUserModal")?.addEventListener("click", (e) => {
    if (e.target.id === "editUserModal") {
      const modal = e.target;
      modal.classList.remove("show");
      setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }, 250);
    }
  });
  document.getElementById("deleteUserModal")?.addEventListener("click", (e) => {
    if (e.target.id === "deleteUserModal") {
      closeDeleteUserModal();
    }
  });
  document
    .getElementById("resetPasswordModal")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "resetPasswordModal") {
        closeResetPasswordModal();
      }
    });

  // Load users when users tab is shown - ALWAYS fetch to ensure fresh data
  const usersTabButton = document.querySelector('[data-tab="users"]');
  if (usersTabButton) {
    usersTabButton.addEventListener("click", () => {
      fetchUsers();
    });
  }

  const analyticsTabButton = document.querySelector('[data-tab="analytics"]');
  if (analyticsTabButton) {
    analyticsTabButton.addEventListener("click", () => {
      const dateRange =
        document.getElementById("analyticsDateRange")?.value || "30d";
      fetchAnalytics(dateRange);
    });
  }

  const analyticsDateRange = document.getElementById("analyticsDateRange");
  if (analyticsDateRange) {
    analyticsDateRange.addEventListener("change", (e) => {
      fetchAnalytics(e.target.value);
    });
  }

  updateSortIndicators();

  // Initialize scroll reveal animations (matching home.js)
  initScrollReveal();
}

/**
 * Initializes scroll reveal animations for overview sections
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll(".scroll-reveal");

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }
  );

  revealElements.forEach((el) => {
    revealObserver.observe(el);
  });

  // Trigger reveal for immediately visible elements
  setTimeout(() => {
    revealElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 50) {
        el.classList.add("revealed");
      }
    });
  }, 100);
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", initializeAdminDashboard);

// Make functions globally available for onclick handlers
window.editUser = editUser;
window.deleteUser = deleteUser;
window.resetUserPassword = resetUserPassword;
window.toggleUserSelection = toggleUserSelection;
window.fetchUsers = fetchUsers;
window.updateRoleDropdownDisplay = updateRoleDropdownDisplay;
window.handleColumnSort = handleColumnSort;
window.fetchAnalytics = fetchAnalytics;

async function fetchAnalytics(dateRange = "30d") {
  console.log("[fetchAnalytics] Fetching analytics for date range:", dateRange);
  try {
    const response = await fetch(
      `${ANALYTICS_ENDPOINT}?dateRange=${dateRange}`
    );
    console.log("[fetchAnalytics] Response status:", response.status);
    if (!response.ok) throw new Error("Failed to fetch analytics");
    const data = await response.json();
    console.log("[fetchAnalytics] Received data:", data);
    renderAnalyticsCharts(data);
  } catch (error) {
    console.error("[fetchAnalytics] Error:", error);
    showMessage("Failed to load analytics data", "error");
  }
}

function renderAnalyticsCharts(data) {
  console.log("[renderAnalyticsCharts] Rendering charts with data:", data);
  const chartColors = {
    primary: "rgb(59, 130, 246)",
    secondary: "rgb(139, 92, 246)",
    success: "rgb(34, 197, 94)",
    warning: "rgb(245, 158, 11)",
    danger: "rgb(239, 68, 68)",
  };

  if (AdminState.charts.userGrowth) AdminState.charts.userGrowth.destroy();
  if (AdminState.charts.roleDistribution)
    AdminState.charts.roleDistribution.destroy();
  if (AdminState.charts.personaDistribution)
    AdminState.charts.personaDistribution.destroy();
  if (AdminState.charts.dailySignups) AdminState.charts.dailySignups.destroy();

  const userGrowthCtx = document.getElementById("userGrowthChart");
  if (userGrowthCtx && data.userGrowth) {
    AdminState.charts.userGrowth = new Chart(userGrowthCtx, {
      type: "line",
      data: {
        labels: data.userGrowth.labels,
        datasets: [
          {
            label: "Total Users",
            data: data.userGrowth.data,
            borderColor: chartColors.primary,
            backgroundColor: `${chartColors.primary}20`,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }

  const roleDistCtx = document.getElementById("roleDistributionChart");
  if (roleDistCtx && data.roleDistribution) {
    const roleLabels = Object.keys(data.roleDistribution);
    const roleCounts = Object.values(data.roleDistribution);

    AdminState.charts.roleDistribution = new Chart(roleDistCtx, {
      type: "doughnut",
      data: {
        labels: roleLabels,
        datasets: [
          {
            data: roleCounts,
            backgroundColor: [
              chartColors.primary,
              chartColors.secondary,
              chartColors.success,
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
  }

  const personaDistCtx = document.getElementById("personaDistributionChart");
  if (
    personaDistCtx &&
    data.personaDistribution &&
    Array.isArray(data.personaDistribution)
  ) {
    AdminState.charts.personaDistribution = new Chart(personaDistCtx, {
      type: "bar",
      data: {
        labels: data.personaDistribution.map((p) => p.name),
        datasets: [
          {
            label: "Users",
            data: data.personaDistribution.map((p) => p.count),
            backgroundColor: chartColors.secondary,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }

  const tripCreationCtx = document.getElementById("dailySignupsChart");
  if (tripCreationCtx && data.tripCreation) {
    AdminState.charts.dailySignups = new Chart(tripCreationCtx, {
      type: "bar",
      data: {
        labels: data.tripCreation.labels,
        datasets: [
          {
            label: "New Trips",
            data: data.tripCreation.data,
            backgroundColor: chartColors.success,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }
}
