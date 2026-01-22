/**
 * Settings page functionality
 */

/**
 * Settings page functionality
 * Implements SOLID principles for maintainable and extensible code
 */

/**
 * Configuration constants for the settings page
 * Centralizes all configuration values to follow Single Responsibility Principle
 */
const SETTINGS_CONSTANTS = {
  SELECTORS: {
    CONTENT_SECTION: ".content-section",
    CATEGORY_LINK: ".category-link",
    SETTINGS_MAIN: ".settings-main",
    CUSTOM_DROPDOWN: ".custom-dropdown",
    CUSTOM_DROPDOWN_BUTTON: ".custom-dropdown-button",
    CUSTOM_DROPDOWN_MENU: ".custom-dropdown-menu",
    CUSTOM_DROPDOWN_OPTION: ".custom-dropdown-option",
    MAIN_HEADER: "#mainHeader",
    USER_CHIP: "#userChip",
    USER_DROPDOWN: "#userDropdown",
    USER_DROPDOWN_BACKDROP: "#userDropdownBackdrop",
    AVATAR_INPUT: "#avatarInput",
    AVATAR_PREVIEW: "#avatarPreview",
    MESSAGE_CONTAINER: "#messageContainer",
  },
  CLASSES: {
    ACTIVE: "active",
    REVEALED: "revealed",
    DROPDOWN_UP: "dropdown-up",
    DROPDOWN_OPEN: "dropdown-open",
    SELECTED: "selected",
    SCROLLED: "scrolled",
    INVISIBLE: "invisible",
    SHOW: "show",
  },
  ANIMATION: {
    SCROLL_THRESHOLD: 0.15,
    SCROLL_MARGIN: "0px 0px -50px 0px",
    STAGGER_DELAY: 80,
    STAGGER_INCREMENT: 50,
    MENU_HEIGHT_ESTIMATE: 200,
    SCROLL_OFFSET: 20,
    DEBOUNCE_DELAY: 50,
    SCROLL_COMPLETE_DELAY: 900,
  },
  API: {
    BASE_URL: "/api/user",
    ENDPOINTS: {
      SETTINGS: "/settings",
      PROFILE: "/profile",
      PREFERENCES: "/preferences",
      PASSWORD: "/password",
      ACCOUNT: "/account",
      NOTIFICATIONS: "/notifications",
      PRIVACY: "/privacy",
    },
  },
};

/**
 * API Service Layer
 * Handles all HTTP communication with the backend
 * Follows Dependency Inversion Principle by providing an abstraction
 */
class UserSettingsApiService {
  /**
   * Retrieves authentication token from localStorage
   * @returns {string|null} JWT token or null if not found
   */
  _getAuthToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }

  /**
   * Performs an authenticated HTTP request
   * Supports both token-based (localStorage) and cookie-based (HTTP-only) authentication
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Fetch API options
   * @returns {Promise<Response>} Fetch response
   */
  async _authenticatedRequest(endpoint, options = {}) {
    const token = this._getAuthToken();
    
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // If token exists in storage, use it in Authorization header
    // Otherwise, rely on HTTP-only cookie (for OAuth users)
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${SETTINGS_CONSTANTS.API.BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
        credentials: "include", // Always include cookies for OAuth users
      }
    );

    if (!response.ok) {
      // If unauthorized and we have a token, it might be expired
      if (response.status === 401 && token) {
        // Clear expired token
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        // Try redirecting to auth page
        if (window.location.pathname !== "/auth") {
          window.location.href = "/auth";
          return;
        }
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    return response.json();
  }

  /**
   * Fetches user settings from the backend
   * @returns {Promise<Object>} User settings object
   */
  async getUserSettings() {
    return this._authenticatedRequest(
      SETTINGS_CONSTANTS.API.ENDPOINTS.SETTINGS,
      {
        method: "GET",
      }
    );
  }

  /**
   * Updates user profile information
   * @param {Object} profileData - Object containing name and/or email
   * @returns {Promise<Object>} Updated user object
   */
  async updateProfile(profileData) {
    return this._authenticatedRequest(
      SETTINGS_CONSTANTS.API.ENDPOINTS.PROFILE,
      {
        method: "PUT",
        body: JSON.stringify(profileData),
      }
    );
  }

  /**
   * Updates user preferences
   * @param {Object} preferences - Object containing currency, measurementSystem, and/or timezone
   * @returns {Promise<Object>} Updated user object
   */
  async updatePreferences(preferences) {
    return this._authenticatedRequest(
      SETTINGS_CONSTANTS.API.ENDPOINTS.PREFERENCES,
      {
        method: "PUT",
        body: JSON.stringify(preferences),
      }
    );
  }

  /**
   * Updates user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success response
   */
  async updatePassword(currentPassword, newPassword) {
    return this._authenticatedRequest(
      SETTINGS_CONSTANTS.API.ENDPOINTS.PASSWORD,
      {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      }
    );
  }

  /**
   * Deletes user account
   * @returns {Promise<Object>} Success response
   */
  async deleteAccount() {
    return this._authenticatedRequest(
      SETTINGS_CONSTANTS.API.ENDPOINTS.ACCOUNT,
      {
        method: "DELETE",
      }
    );
  }

  /**
   * Updates user notification preferences
   * @param {Object} preferences - Object containing notification preference booleans
   * @returns {Promise<Object>} Updated preferences object
   */
  async updateNotificationPreferences(preferences) {
    return this._authenticatedRequest(
      SETTINGS_CONSTANTS.API.ENDPOINTS.NOTIFICATIONS,
      {
        method: "PUT",
        body: JSON.stringify(preferences),
      }
    );
  }

  /**
   * Updates user privacy preferences
   * @param {Object} preferences - Object containing privacy preference booleans
   * @returns {Promise<Object>} Updated preferences object
   */
  async updatePrivacyPreferences(preferences) {
    return this._authenticatedRequest(
      SETTINGS_CONSTANTS.API.ENDPOINTS.PRIVACY,
      {
        method: "PUT",
        body: JSON.stringify(preferences),
      }
    );
  }
}

class DropdownManager {
  constructor() {
    this.activeDropdown = null;
    this.messageManager = null;
  }

  initialize(messageManager) {
    this.messageManager = messageManager;
    const dropdowns = Utils.getElements(
      SETTINGS_CONSTANTS.SELECTORS.CUSTOM_DROPDOWN
    );

    dropdowns.forEach((dropdown) => {
      this._initializeDropdown(dropdown);
    });

    this._setupGlobalEventListeners();
  }

  _initializeDropdown(dropdown) {
    const button = dropdown.querySelector(
      SETTINGS_CONSTANTS.SELECTORS.CUSTOM_DROPDOWN_BUTTON
    );
    const menu = dropdown.querySelector(
      SETTINGS_CONSTANTS.SELECTORS.CUSTOM_DROPDOWN_MENU
    );
    const options = dropdown.querySelectorAll(
      SETTINGS_CONSTANTS.SELECTORS.CUSTOM_DROPDOWN_OPTION
    );
    const select = dropdown.querySelector("select.form-select");
    const valueSpan = button?.querySelector(".dropdown-value");

    if (!button || !menu || !select) {
      console.warn("Dropdown missing required elements", dropdown);
      return;
    }

    this._setInitialValue(select, valueSpan);
    this._markSelectedOption(options, select.value);
    this._setupDropdownEvents(
      dropdown,
      button,
      menu,
      options,
      select,
      valueSpan
    );
  }

  _setInitialValue(select, valueSpan) {
    const selectedOption = select.querySelector("option:checked");
    if (selectedOption && valueSpan) {
      valueSpan.textContent = selectedOption.textContent;
    }
  }

  _markSelectedOption(options, selectedValue) {
    options.forEach((option) => {
      if (option.dataset.value === selectedValue) {
        option.classList.add(SETTINGS_CONSTANTS.CLASSES.SELECTED);
      }
    });
  }

  _setupDropdownEvents(dropdown, button, menu, options, select, valueSpan) {
    button.addEventListener("click", (e) =>
      this._handleButtonClick(e, dropdown, button, menu)
    );

    options.forEach((option) => {
      option.addEventListener("click", (e) =>
        this._handleOptionClick(
          e,
          dropdown,
          button,
          menu,
          options,
          option,
          select,
          valueSpan
        )
      );
    });
  }

  _handleButtonClick(e, dropdown, button, menu) {
    e.stopPropagation();
    const isActive = button.classList.contains(
      SETTINGS_CONSTANTS.CLASSES.ACTIVE
    );

    this._closeAllDropdowns(button);

    if (isActive) {
      this._closeDropdown(dropdown, button, menu);
    } else {
      this._openDropdown(dropdown, button, menu);
    }
  }

  _handleOptionClick(
    e,
    dropdown,
    button,
    menu,
    options,
    clickedOption,
    select,
    valueSpan
  ) {
    e.stopPropagation();

    const value = clickedOption.dataset.value;
    const text = clickedOption.textContent.trim();

    this._updateSelectValue(select, value);
    this._updateButtonDisplay(valueSpan, text);
    this._updateSelectedState(options, clickedOption);
    this._closeDropdown(dropdown, button, menu);
    this._reinitializeIcons();
  }

  _updateSelectValue(select, value) {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  _updateButtonDisplay(valueSpan, text) {
    if (valueSpan) {
      valueSpan.textContent = text;
    }
  }

  _updateSelectedState(options, selectedOption) {
    options.forEach((opt) =>
      opt.classList.remove(SETTINGS_CONSTANTS.CLASSES.SELECTED)
    );
    selectedOption.classList.add(SETTINGS_CONSTANTS.CLASSES.SELECTED);
  }

  _openDropdown(dropdown, button, menu) {
    button.classList.add(SETTINGS_CONSTANTS.CLASSES.ACTIVE);
    dropdown.classList.add(SETTINGS_CONSTANTS.CLASSES.DROPDOWN_OPEN);

    const card = button.closest(".settings-card");
    if (card) card.classList.add(SETTINGS_CONSTANTS.CLASSES.DROPDOWN_OPEN);

    this._determineDropdownDirection(button, menu);
    menu.classList.add(SETTINGS_CONSTANTS.CLASSES.ACTIVE);
    this._scrollToSelectedOption(menu);
    this.activeDropdown = dropdown;
  }

  _closeDropdown(dropdown, button, menu) {
    button.classList.remove(SETTINGS_CONSTANTS.CLASSES.ACTIVE);
    menu.classList.remove(SETTINGS_CONSTANTS.CLASSES.ACTIVE);
    menu.classList.remove(SETTINGS_CONSTANTS.CLASSES.DROPDOWN_UP);
    dropdown.classList.remove(SETTINGS_CONSTANTS.CLASSES.DROPDOWN_OPEN);

    const card = button.closest(".settings-card");
    if (card) card.classList.remove(SETTINGS_CONSTANTS.CLASSES.DROPDOWN_OPEN);

    if (this.activeDropdown === dropdown) {
      this.activeDropdown = null;
    }
  }

  _determineDropdownDirection(button, menu) {
    const buttonRect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;

    if (
      spaceBelow < SETTINGS_CONSTANTS.ANIMATION.MENU_HEIGHT_ESTIMATE &&
      buttonRect.top > SETTINGS_CONSTANTS.ANIMATION.MENU_HEIGHT_ESTIMATE
    ) {
      menu.classList.add(SETTINGS_CONSTANTS.CLASSES.DROPDOWN_UP);
    } else {
      menu.classList.remove(SETTINGS_CONSTANTS.CLASSES.DROPDOWN_UP);
    }
  }

  _scrollToSelectedOption(menu) {
    const selectedOption = menu.querySelector(
      `.${SETTINGS_CONSTANTS.CLASSES.SELECTED}`
    );
    if (selectedOption) {
      setTimeout(() => {
        selectedOption.scrollIntoView({
          block: "nearest",
          behavior: "auto",
        });
      }, 100);
    }
  }

  _closeAllDropdowns(exceptButton) {
    Utils.getElements(
      SETTINGS_CONSTANTS.SELECTORS.CUSTOM_DROPDOWN_BUTTON
    ).forEach((btn) => {
      if (btn !== exceptButton) {
        const dropdown = btn.closest(
          SETTINGS_CONSTANTS.SELECTORS.CUSTOM_DROPDOWN
        );
        const menu = dropdown?.querySelector(
          SETTINGS_CONSTANTS.SELECTORS.CUSTOM_DROPDOWN_MENU
        );
        if (menu) {
          btn.classList.remove(SETTINGS_CONSTANTS.CLASSES.ACTIVE);
          menu.classList.remove(SETTINGS_CONSTANTS.CLASSES.ACTIVE);
        }
      }
    });
  }

  _setupGlobalEventListeners() {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(SETTINGS_CONSTANTS.SELECTORS.CUSTOM_DROPDOWN)) {
        this._closeAllDropdowns(null);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this._closeAllDropdowns(null);
      }
    });
  }

  _reinitializeIcons() {
    setTimeout(() => {
      if (window.lucide?.createIcons) {
        window.lucide.createIcons();
      }
    }, 100);
  }
}

class ScrollNavigationManager {
  constructor() {
    this.isScrolling = false;
    this.activeLinkTimeout = null;
    this.lastActiveIndex = -1;
    this.visibleSections = null;
    this.visibleCategoryLinks = null;
  }

  initialize() {
    const mainContent = Utils.getElement(
      SETTINGS_CONSTANTS.SELECTORS.SETTINGS_MAIN
    );
    const allSections = Utils.getElements(
      SETTINGS_CONSTANTS.SELECTORS.CONTENT_SECTION
    );

    if (!mainContent || allSections.length === 0) return;

    // Filter out hidden sections (e.g., security section for OAuth users)
    const sections = Array.from(allSections).filter(section => {
      const style = window.getComputedStyle(section);
      return style.display !== 'none';
    });

    if (sections.length === 0) return;

    // Cache visible sections and category links
    this.visibleSections = sections;
    this._cacheVisibleCategoryLinks();

    this._setupScrollObserver(sections);
    this._setupStaggeredAnimation();
    this._setupScrollListener(mainContent, sections);
    this._setInitialActiveState(mainContent, sections);
  }

  /**
   * Caches visible category links for performance
   * @private
   */
  _cacheVisibleCategoryLinks() {
    const allCategoryLinks = Utils.getElements(
      SETTINGS_CONSTANTS.SELECTORS.CATEGORY_LINK
    );
    this.visibleCategoryLinks = Array.from(allCategoryLinks).filter(link => {
      const navItem = link.closest('.category-item');
      if (!navItem) return true;
      const style = window.getComputedStyle(navItem);
      return style.display !== 'none';
    });
  }

  _setupScrollObserver(sections) {
    const observerOptions = {
      threshold: SETTINGS_CONSTANTS.ANIMATION.SCROLL_THRESHOLD,
      rootMargin: SETTINGS_CONSTANTS.ANIMATION.SCROLL_MARGIN,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(SETTINGS_CONSTANTS.CLASSES.REVEALED);
        }
      });
    }, observerOptions);

    // Only observe visible sections
    sections.forEach((section) => {
      observer.observe(section);
    });
  }

  _setupStaggeredAnimation() {
    const categoryLinks = Utils.getElements(
      SETTINGS_CONSTANTS.SELECTORS.CATEGORY_LINK
    );
    categoryLinks.forEach((link, index) => {
      setTimeout(() => {
        link.classList.add(SETTINGS_CONSTANTS.CLASSES.REVEALED);
      }, SETTINGS_CONSTANTS.ANIMATION.STAGGER_DELAY + index * SETTINGS_CONSTANTS.ANIMATION.STAGGER_INCREMENT);
    });
  }

  _setupScrollListener(mainContent, sections) {
    mainContent.addEventListener(
      "scroll",
      Utils.throttle(() => this._handleScroll(mainContent, sections), 16),
      { passive: true }
    );
  }

  _handleScroll(mainContent, sections) {
    if (this.isScrolling) return;

    // Use cached visible sections for performance
    const visibleSections = this.visibleSections || sections;

    if (visibleSections.length === 0) return;

    const scrollTop = mainContent.scrollTop;
    const scrollHeight = mainContent.scrollHeight;
    const clientHeight = mainContent.clientHeight;
    const scrollMiddle = scrollTop + clientHeight / 3;
    const scrollBottom = scrollTop + clientHeight;

    const currentActiveIndex = this._findActiveSectionIndex(
      visibleSections,
      scrollTop,
      scrollMiddle,
      scrollBottom,
      scrollHeight
    );

    if (
      currentActiveIndex !== -1 &&
      currentActiveIndex !== this.lastActiveIndex
    ) {
      this.lastActiveIndex = currentActiveIndex;
      const activeSection = visibleSections[currentActiveIndex];
      if (activeSection) {
        this._updateActiveLink(activeSection.id, currentActiveIndex);
      }
    }
  }

  _findActiveSectionIndex(
    sections,
    scrollTop,
    scrollMiddle,
    scrollBottom,
    scrollHeight
  ) {
    if (sections.length === 0) return -1;

    const threshold = 150;
    const bottomThreshold = 100;

    // If we're at the very top, return first section
    if (scrollTop < 50) {
      return 0;
    }

    // If we're at or near the bottom of the scroll container, return the last section
    if (scrollBottom >= scrollHeight - bottomThreshold) {
      return sections.length - 1;
    }

    for (let index = 0; index < sections.length; index++) {
      const section = sections[index];
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;

      // Check if scroll position is within the section bounds using scrollMiddle
      if (scrollMiddle >= sectionTop && scrollMiddle < sectionBottom) {
        return index;
      }

      // Check if scrollTop is near the section top
      if (
        scrollTop >= sectionTop - threshold &&
        scrollTop < sectionTop + threshold
      ) {
        return index;
      }

      // Check if we're past the section but before the next one
      if (index < sections.length - 1) {
        const nextSection = sections[index + 1];
        const nextSectionTop = nextSection.offsetTop;
        if (scrollTop >= sectionTop && scrollTop < nextSectionTop) {
          return index;
        }
      } else {
        // This is the last section - check if we're past its top
        if (scrollTop >= sectionTop - threshold) {
          return index;
        }
      }
    }

    return -1;
  }

  _updateActiveLink(sectionId, index) {
    if (this.activeLinkTimeout) {
      clearTimeout(this.activeLinkTimeout);
    }

    // Use cached visible category links for better performance
    const visibleCategoryLinks = this.visibleCategoryLinks || 
      Utils.getElements(SETTINGS_CONSTANTS.SELECTORS.CATEGORY_LINK);

    const targetLinks = Utils.getElements(`[href="#${sectionId}"]`);

    // Update active state immediately for better responsiveness
    // Use minimal debounce to batch rapid updates
    this.activeLinkTimeout = setTimeout(() => {
      visibleCategoryLinks.forEach((link) => {
        const isTarget = Array.from(targetLinks).includes(link);
        link.classList.toggle(SETTINGS_CONSTANTS.CLASSES.ACTIVE, isTarget);
      });
    }, 10); // Reduced from 50ms to 10ms for faster response
  }

  _setInitialActiveState(mainContent, sections) {
    // Use cached visible sections
    const visibleSections = this.visibleSections || sections;

    if (visibleSections.length === 0) return;

    setTimeout(() => {
      const scrollTop = mainContent.scrollTop || 0;
      const scrollMiddle = scrollTop + mainContent.clientHeight / 3;
      const scrollBottom = scrollTop + mainContent.clientHeight;
      const scrollHeight = mainContent.scrollHeight;

      const activeIndex = this._findActiveSectionIndex(
        visibleSections,
        scrollTop,
        scrollMiddle,
        scrollBottom,
        scrollHeight
      );

      if (activeIndex >= 0 && visibleSections[activeIndex]) {
        this._updateActiveLink(visibleSections[activeIndex].id, activeIndex);
      }
    }, 50); // Reduced from 100ms to 50ms for faster initial state
  }

  scrollToSection(sectionId) {
    const section = Utils.getElement(`#${sectionId}`);
    const mainContent = Utils.getElement(
      SETTINGS_CONSTANTS.SELECTORS.SETTINGS_MAIN
    );
    if (!section || !mainContent) return;

    const sectionTop = section.offsetTop - mainContent.offsetTop - 20;
    this.isScrolling = true;

    this._updateActiveLinksForSection(sectionId);
    this._animateLinkClick(sectionId);

    mainContent.scrollTo({
      top: sectionTop,
      behavior: "smooth",
    });

    setTimeout(() => {
      this.isScrolling = false;
    }, SETTINGS_CONSTANTS.ANIMATION.SCROLL_COMPLETE_DELAY);
  }

  _updateActiveLinksForSection(sectionId) {
    const targetLinks = Utils.getElements(`[href="#${sectionId}"]`);
    // Use cached visible category links
    const visibleCategoryLinks = this.visibleCategoryLinks || 
      Utils.getElements(SETTINGS_CONSTANTS.SELECTORS.CATEGORY_LINK);

    visibleCategoryLinks.forEach((link) => {
      const isTarget = Array.from(targetLinks).includes(link);
      link.classList.toggle(SETTINGS_CONSTANTS.CLASSES.ACTIVE, isTarget);
    });
  }

  _animateLinkClick(sectionId) {
    const targetLinks = Utils.getElements(`[href="#${sectionId}"]`);
    targetLinks.forEach((link) => {
      link.style.transform = "translateX(0) scale(0.98)";
      requestAnimationFrame(() => {
        link.style.transform = "";
      });
    });
  }
}

class HeaderManager {
  constructor() {
    this.scrollThreshold = SETTINGS_CONSTANTS.ANIMATION.SCROLL_OFFSET;
  }

  initialize() {
    const header = Utils.getElement(SETTINGS_CONSTANTS.SELECTORS.MAIN_HEADER);
    if (!header) return;

    window.addEventListener(
      "scroll",
      Utils.throttle(() => this._handleScroll(header), 16),
      { passive: true }
    );

    this._handleScroll(header);
  }

  _handleScroll(header) {
    const scrollY = window.scrollY || window.pageYOffset;
    header.classList.toggle(
      SETTINGS_CONSTANTS.CLASSES.SCROLLED,
      scrollY > this.scrollThreshold
    );
  }
}

class UserDropdownManager {
  initialize() {
    const userChip = Utils.getElement(SETTINGS_CONSTANTS.SELECTORS.USER_CHIP);
    const userDropdown = Utils.getElement(
      SETTINGS_CONSTANTS.SELECTORS.USER_DROPDOWN
    );
    const backdrop = Utils.getElement(
      SETTINGS_CONSTANTS.SELECTORS.USER_DROPDOWN_BACKDROP
    );

    if (!userChip || !userDropdown) return;

    userChip.addEventListener("click", (e) =>
      this._handleChipClick(e, userDropdown, backdrop)
    );
    if (backdrop) {
      backdrop.addEventListener("click", () =>
        this._closeDropdown(userDropdown, backdrop)
      );
    }

    // Handle dropdown item clicks
    const dropdownItems = userDropdown.querySelectorAll(".dropdown-item");
    dropdownItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const action = item.getAttribute("data-action");
        this._closeDropdown(userDropdown, backdrop);

        // Handle actions
        if (action === "profile") {
          // Navigate to profile page (if exists) or home
          window.location.href = "/home";
        } else if (action === "settings") {
          // Already on settings page, do nothing or refresh
          // Could navigate to settings if not already there
        } else if (action === "logout") {
          // Handle logout
          if (window.AuthService && window.AuthService.logout) {
            window.AuthService.logout();
          } else {
            // Fallback: clear storage and redirect
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/auth";
          }
        }
      });
    });
  }

  _handleChipClick(e, dropdown, backdrop) {
    e.stopPropagation();
    const isVisible = dropdown.classList.contains("active");

    if (isVisible) {
      this._closeDropdown(dropdown, backdrop);
    } else {
      this._openDropdown(dropdown, backdrop);
    }
  }

  _openDropdown(dropdown, backdrop) {
    dropdown.classList.remove("invisible", "opacity-0");
    dropdown.classList.add("active");
    if (backdrop) {
      backdrop.classList.remove("hidden");
      backdrop.classList.add("active");
    }
  }

  _closeDropdown(dropdown, backdrop) {
    dropdown.classList.add("invisible", "opacity-0");
    dropdown.classList.remove("active");
    if (backdrop) {
      backdrop.classList.add("hidden");
      backdrop.classList.remove("active");
    }
  }
}

class AvatarManager {
  constructor(messageManager) {
    this.messageManager = messageManager;
    this.maxFileSize = APP_CONSTANTS.VALIDATION.MAX_FILE_SIZE;
  }

  initialize() {
    const avatarInput = Utils.getElement(
      SETTINGS_CONSTANTS.SELECTORS.AVATAR_INPUT
    );
    const avatarPreview = Utils.getElement(
      SETTINGS_CONSTANTS.SELECTORS.AVATAR_PREVIEW
    );

    if (!avatarInput || !avatarPreview) return;

    avatarInput.addEventListener("change", (e) =>
      this._handleFileSelect(e, avatarPreview)
    );
  }

  _handleFileSelect(e, preview) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > this.maxFileSize) {
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.FILE_SIZE_ERROR,
        "error"
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) =>
      this._updatePreview(preview, event.target.result);
    reader.readAsDataURL(file);
  }

  _updatePreview(preview, imageUrl) {
    preview.style.backgroundImage = `url(${imageUrl})`;
    preview.style.backgroundSize = "cover";
    preview.style.backgroundPosition = "center";
    preview.textContent = "";
  }
}

/**
 * Settings Form Manager
 * Handles form submissions and user settings updates
 * Follows Single Responsibility Principle and Dependency Inversion Principle
 */
class SettingsFormManager {
  /**
   * Creates a new SettingsFormManager instance
   * @param {MessageManager} messageManager - Message manager for notifications
   * @param {UserSettingsApiService} apiService - API service for backend communication
   */
  constructor(messageManager, apiService) {
    this.messageManager = messageManager;
    this.apiService = apiService;
    this.originalSettings = null;
    this.deleteModalBackdropHandler = null;
  }

  /**
   * Loads user settings from the backend and populates the form
   */
  async loadUserSettings() {
    try {
      const settings = await this.apiService.getUserSettings();
      this.originalSettings = settings;
      this._populateForm(settings);
      this._updateHeaderUserInfo(settings);
    } catch (error) {
      console.error("Failed to load user settings:", error);
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.PROFILE_LOAD_ERROR,
        "error",
        undefined,
        "profile-section"
      );
    }
  }

  /**
   * Populates form fields with user settings data
   * @param {Object} settings - User settings object
   * @private
   */
  _populateForm(settings) {
    console.log("[DEBUG] Populating form with settings:", settings);

    // Hide security section for OAuth users
    this._handleOAuthUserSecuritySection(settings);

    this._setInputValue("userNameInput", settings.name || "");
    this._setInputValue("userEmailInput", settings.email || "");
    
    // Disable email input for OAuth users (they can't change their email)
    const emailInput = Utils.getElement("#userEmailInput");
    if (emailInput) {
      const isOAuthUser = settings.authProvider && settings.authProvider !== "email";
      if (isOAuthUser) {
        emailInput.disabled = true;
        emailInput.title = `Email is managed by ${settings.authProvider === "google" ? "Google" : settings.authProvider === "facebook" ? "Facebook" : settings.authProvider}. It cannot be changed.`;
        emailInput.style.cursor = "not-allowed";
        emailInput.style.opacity = "0.7";
        
        // Add helper text
        const emailLabel = emailInput.closest(".settings-field")?.querySelector("label");
        if (emailLabel && !emailInput.parentElement.querySelector(".oauth-email-note")) {
          const note = document.createElement("p");
          note.className = "oauth-email-note";
          note.style.fontSize = "0.75rem";
          note.style.color = "var(--muted)";
          note.style.marginTop = "0.25rem";
          note.textContent = `Email is managed by ${settings.authProvider === "google" ? "Google" : settings.authProvider === "facebook" ? "Facebook" : settings.authProvider} and cannot be changed.`;
          emailInput.parentElement.appendChild(note);
        }
      } else {
        emailInput.disabled = false;
        emailInput.style.cursor = "text";
        emailInput.style.opacity = "1";
        
        // Remove helper text if exists
        const note = emailInput.parentElement.querySelector(".oauth-email-note");
        if (note) {
          note.remove();
        }
      }
    }

    // Handle timezone format conversion - database may use IANA format, dropdown uses GMT format
    let timezoneValue = settings.timezone || "GMT+8";
    // If timezone is in IANA format (e.g., "Asia/Singapore"), map to GMT format
    if (timezoneValue.includes("/") || timezoneValue.includes("_")) {
      // Map common IANA timezones to GMT format
      const timezoneMap = {
        "Asia/Singapore": "GMT+8",
        "America/New_York": "GMT-5",
        "America/Los_Angeles": "GMT-8",
        "Europe/London": "GMT+0",
        "Europe/Paris": "GMT+1",
        "Asia/Tokyo": "GMT+9",
        "Australia/Sydney": "GMT+10",
      };
      timezoneValue = timezoneMap[timezoneValue] || "GMT+8";
    }
    console.log("[DEBUG] Setting timezone to:", timezoneValue);
    this._setSelectValue("timezoneSelect", timezoneValue);

    // Store the displayed timezone value for comparison
    this._displayedTimezone = timezoneValue;

    const currencyValue = settings.currency || "USD";
    console.log("[DEBUG] Setting currency to:", currencyValue);
    this._setSelectValue("currencySelect", currencyValue);

    const measurementSystemValue = settings.measurementSystem || "metric";
    console.log(
      "[DEBUG] Setting measurementSystem to:",
      measurementSystemValue
    );
    this._setSelectValue("unitsSelect", measurementSystemValue);

    // Populate notification preferences
    this._setCheckboxValue("emailNotifications", settings.emailNotifications !== false);
    this._setCheckboxValue("flightAlerts", settings.flightAlerts !== false);
    this._setCheckboxValue("tripReminders", settings.tripReminders !== false);
    this._setCheckboxValue("groupActivityNotifications", settings.groupActivityNotifications !== false);
    this._setCheckboxValue("marketingEmails", settings.marketingEmails === true);

    // Populate privacy preferences
    this._setCheckboxValue("profileVisibility", settings.profileVisibility === true);
    this._setCheckboxValue("activityStatusVisible", settings.activityStatusVisible !== false);
    this._setCheckboxValue("allowDataAnalytics", settings.allowDataAnalytics === true);

          // Populate avatar preview if profilePictureUrl exists (for OAuth users)
          if (settings.profilePictureUrl) {
            const avatarPreview = Utils.getElement(SETTINGS_CONSTANTS.SELECTORS.AVATAR_PREVIEW);
            if (avatarPreview) {
              this._updatePreview(avatarPreview, settings.profilePictureUrl);
            }
          }
        }

  /**
   * Hides security section and navigation link for OAuth users
   * @param {Object} settings - User settings object
   * @private
   */
  _handleOAuthUserSecuritySection(settings) {
    const isOAuthUser = settings.authProvider && settings.authProvider !== "email";
    
    // Hide security section
    const securitySection = document.getElementById("security-section");
    if (securitySection) {
      if (isOAuthUser) {
        securitySection.style.display = "none";
      } else {
        securitySection.style.display = "";
      }
    }
    
    // Hide security navigation link
    const securityNavLink = document.querySelector('a[href="#security-section"]');
    if (securityNavLink) {
      const securityNavItem = securityNavLink.closest(".category-item");
      if (securityNavItem) {
        if (isOAuthUser) {
          securityNavItem.style.display = "none";
        } else {
          securityNavItem.style.display = "";
        }
      }
    }
    
    // Re-initialize scroll navigation manager to account for hidden sections
    // Use setTimeout to ensure DOM updates are complete
    setTimeout(() => {
      if (window.settingsApp && window.settingsApp.scrollNavManager) {
        window.settingsApp.scrollNavManager.initialize();
      }
    }, 50); // Reduced delay for faster re-initialization
  }

  /**
   * Updates avatar preview with image URL
   * @param {HTMLElement} preview - Avatar preview element
   * @param {string} imageUrl - Image URL
   * @private
   */
  _updatePreview(preview, imageUrl) {
    preview.style.backgroundImage = `url(${imageUrl})`;
    preview.style.backgroundSize = "cover";
    preview.style.backgroundPosition = "center";
    preview.textContent = "";
  }

  /**
   * Saves user profile information
   * Validates input and provides specific feedback about what was updated
   */
  async saveProfile() {
    try {
      const name = this._getInputValue("userNameInput")?.trim();
      const email = this._getInputValue("userEmailInput")?.trim();

      // Validate required fields
      if (!name) {
        this.messageManager?.show(
          APP_CONSTANTS.MESSAGES.NAME_REQUIRED,
          "error"
        );
        return;
      }

      if (!email) {
        this.messageManager?.show(
          APP_CONSTANTS.MESSAGES.EMAIL_REQUIRED,
          "error"
        );
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.messageManager?.show(
          APP_CONSTANTS.MESSAGES.EMAIL_INVALID,
          "error"
        );
        return;
      }

      // Prevent OAuth users from changing their email
      const isOAuthUser = this.originalSettings?.authProvider && 
                          this.originalSettings.authProvider !== "email";
      if (isOAuthUser && email !== (this.originalSettings?.email || "")) {
        this.messageManager?.show(
          `Email cannot be changed for ${this.originalSettings.authProvider === "google" ? "Google" : this.originalSettings.authProvider === "facebook" ? "Facebook" : this.originalSettings.authProvider} accounts. Your email is managed by your OAuth provider.`,
          "error"
        );
        return;
      }

      // Check if there are actual changes
      const hasChanges =
        name !== (this.originalSettings?.name || "") ||
        email !== (this.originalSettings?.email || "");

      if (!hasChanges) {
        this.messageManager?.show(APP_CONSTANTS.MESSAGES.NO_CHANGES, "error");
        return;
      }

      const updatedUser = await this.apiService.updateProfile({ name, email });

      // Build specific success message with proper capitalization
      const updatedFields = [];
      if (name !== (this.originalSettings?.name || "")) {
        updatedFields.push("Name");
      }
      if (email !== (this.originalSettings?.email || "")) {
        updatedFields.push("Email");
      }

      const successMessage =
        updatedFields.length > 0
          ? `${updatedFields.join(" and ")} updated successfully.`
          : APP_CONSTANTS.MESSAGES.PROFILE_SAVED;

      this.messageManager?.show(
        successMessage,
        "success",
        undefined,
        "profile-section"
      );
      this._updateHeaderUserInfo(updatedUser);
      this.originalSettings = { ...this.originalSettings, ...updatedUser };
    } catch (error) {
      console.error("Failed to save profile:", error);

      let errorMessage = APP_CONSTANTS.MESSAGES.PROFILE_SAVE_ERROR;
      if (error.message) {
        if (
          error.message.includes("Email already exists") ||
          error.message.includes("email")
        ) {
          errorMessage = APP_CONSTANTS.MESSAGES.EMAIL_EXISTS;
        } else if (error.message.includes("Invalid email")) {
          errorMessage = APP_CONSTANTS.MESSAGES.EMAIL_INVALID;
        } else {
          errorMessage = error.message;
        }
      }

      this.messageManager?.show(
        errorMessage,
        "error",
        undefined,
        "profile-section"
      );
    }
  }

  /**
   * Resets profile form to original values
   */
  resetProfile() {
    if (!this.originalSettings) {
      this.messageManager?.show(
        "No original settings to reset to.",
        "error",
        undefined,
        "profile-section"
      );
      return;
    }

    this._populateForm(this.originalSettings);
    this.messageManager?.show(
      APP_CONSTANTS.MESSAGES.PROFILE_RESET,
      "success",
      undefined,
      "profile-section"
    );
  }

  /**
   * Saves user preferences (currency, measurement system, timezone)
   * Validates input and provides specific feedback about what was updated
   */
  async savePreferences() {
    console.log("[CLIENT DEBUG] savePreferences function called!");
    try {
      const currency = this._getSelectValue("currencySelect")?.trim();
      const measurementSystem = this._getSelectValue("unitsSelect")?.trim();
      const timezoneRaw = this._getSelectValue("timezoneSelect");
      const timezone = timezoneRaw?.trim() || "";

      console.log("[CLIENT DEBUG] Raw values retrieved:");
      console.log("  currency:", currency);
      console.log("  measurementSystem:", measurementSystem);
      console.log("  timezoneRaw:", timezoneRaw);
      console.log("  timezone (trimmed):", timezone);

      // Get original values for comparison
      const originalCurrency = this.originalSettings?.currency || "";
      const originalMeasurementSystem =
        this.originalSettings?.measurementSystem || "";
      const originalTimezone = this.originalSettings?.timezone || "";

      // Handle timezone comparison
      // We need to compare the selected timezone (GMT format) with what was originally displayed
      // If _displayedTimezone is set, use it (it's already in GMT format)
      // Otherwise, convert originalTimezone from IANA to GMT if needed
      let displayedTimezone = this._displayedTimezone;

      // If _displayedTimezone is not set, we need to get it from originalTimezone
      if (!displayedTimezone) {
        if (originalTimezone) {
          // Check if originalTimezone is in IANA format and convert to GMT
          if (
            originalTimezone.includes("/") ||
            originalTimezone.includes("_")
          ) {
            const timezoneMap = {
              "Asia/Singapore": "GMT+8",
              "America/New_York": "GMT-5",
              "America/Los_Angeles": "GMT-8",
              "Europe/London": "GMT+0",
              "Europe/Paris": "GMT+1",
              "Asia/Tokyo": "GMT+9",
              "Australia/Sydney": "GMT+10",
            };
            displayedTimezone = timezoneMap[originalTimezone] || "GMT+8";
          } else {
            // Already in GMT format
            displayedTimezone = originalTimezone;
          }
        } else {
          // No original timezone, default to empty
          displayedTimezone = "";
        }
      }

      // Check if timezone has changed
      // Always compare against the original database value (convert to GMT if needed)
      // This is the most reliable comparison
      let timezoneChanged = false;

      if (timezone.length > 0) {
        // Convert original timezone to GMT format for comparison
        let originalTimezoneGMT = "";
        if (originalTimezone) {
          if (
            originalTimezone.includes("/") ||
            originalTimezone.includes("_")
          ) {
            // IANA format - convert to GMT
            const timezoneMap = {
              "Asia/Singapore": "GMT+8",
              "America/New_York": "GMT-5",
              "America/Los_Angeles": "GMT-8",
              "Europe/London": "GMT+0",
              "Europe/Paris": "GMT+1",
              "Asia/Tokyo": "GMT+9",
              "Australia/Sydney": "GMT+10",
            };
            originalTimezoneGMT = timezoneMap[originalTimezone] || "GMT+8";
          } else {
            // Already in GMT format
            originalTimezoneGMT = originalTimezone;
          }
        }

        // If there's no original timezone, any selection is a change
        // If there is an original timezone, compare the selected timezone with it
        timezoneChanged =
          originalTimezoneGMT.length === 0 || timezone !== originalTimezoneGMT;
      }

      // Check if there are actual changes - compare against original values
      const hasChanges =
        (currency && currency !== originalCurrency) ||
        (measurementSystem &&
          measurementSystem !== originalMeasurementSystem) ||
        timezoneChanged;

      if (!hasChanges) {
        // Log debug info - this will help us see what's happening
        console.log("[CLIENT DEBUG] No changes detected:");
        console.log("  Selected timezone:", timezone);
        console.log("  Displayed timezone:", displayedTimezone);
        console.log("  Original timezone:", originalTimezone);
        console.log("  _displayedTimezone:", this._displayedTimezone);
        console.log("  timezoneChanged:", timezoneChanged);
        console.log("  hasChanges:", hasChanges);
        console.log("  Currency:", currency, "Original:", originalCurrency);
        console.log(
          "  MeasurementSystem:",
          measurementSystem,
          "Original:",
          originalMeasurementSystem
        );

        this.messageManager?.show(
          APP_CONSTANTS.MESSAGES.NO_CHANGES,
          "error",
          undefined,
          "travel-section"
        );
        return;
      }

      // Build preferences object with only changed values
      const preferences = {};
      if (currency && currency !== originalCurrency) {
        preferences.currency = currency;
      }
      if (
        measurementSystem &&
        measurementSystem !== originalMeasurementSystem
      ) {
        preferences.measurementSystem = measurementSystem;
      }
      if (timezoneChanged) {
        preferences.timezone = timezone;
      }

      // Ensure at least one field is being updated
      if (Object.keys(preferences).length === 0) {
        console.log(
          "[CLIENT DEBUG] preferences object is empty after building"
        );
        this.messageManager?.show(
          APP_CONSTANTS.MESSAGES.NO_CHANGES,
          "error",
          undefined,
          "travel-section"
        );
        return;
      }

      console.log(
        "[CLIENT DEBUG] Sending preferences to backend:",
        JSON.stringify(preferences, null, 2)
      );
      const updatedUser = await this.apiService.updatePreferences(preferences);

      // Build specific success message with proper capitalization
      const updatedFields = [];
      if (currency && currency !== originalCurrency) {
        updatedFields.push("Currency");
      }
      if (
        measurementSystem &&
        measurementSystem !== originalMeasurementSystem
      ) {
        updatedFields.push("Measurement system");
      }
      if (timezoneChanged) {
        updatedFields.push("Timezone");
        // Update displayed timezone for future comparisons
        this._displayedTimezone = timezone;
        // Also update originalSettings timezone to the GMT format we sent
        // This ensures consistency for future comparisons
        if (!this.originalSettings) {
          this.originalSettings = {};
        }
        this.originalSettings.timezone = timezone;
      }

      // Format message based on number of fields
      let successMessage;
      if (updatedFields.length === 0) {
        successMessage = APP_CONSTANTS.MESSAGES.PREFERENCES_SAVED;
      } else if (updatedFields.length === 1) {
        successMessage = `${updatedFields[0]} updated successfully.`;
      } else if (updatedFields.length === 2) {
        successMessage = `${updatedFields.join(" and ")} updated successfully.`;
      } else {
        const lastField = updatedFields.pop();
        successMessage = `${updatedFields.join(
          ", "
        )}, and ${lastField} updated successfully.`;
      }

      this.messageManager?.show(
        successMessage,
        "success",
        undefined,
        "travel-section"
      );

      // Update originalSettings with the response from server
      // But preserve the timezone in GMT format if we just updated it
      const savedTimezone = this.originalSettings?.timezone;
      this.originalSettings = { ...this.originalSettings, ...updatedUser };
      if (savedTimezone && timezoneChanged) {
        // Keep the GMT format we sent, not what the server might return
        this.originalSettings.timezone = savedTimezone;
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);

      let errorMessage = APP_CONSTANTS.MESSAGES.PREFERENCES_SAVE_ERROR;
      if (error.message) {
        if (error.message.includes("Measurement system")) {
          errorMessage = "Measurement system must be 'metric' or 'imperial'";
        } else {
          errorMessage = error.message;
        }
      }

      this.messageManager?.show(
        errorMessage,
        "error",
        undefined,
        "travel-section"
      );
    }
  }

  /**
   * Changes user password
   */
  async changePassword() {
    try {
      const current = this._getInputValue("currentPassword");
      const newPass = this._getInputValue("newPassword");
      const confirm = this._getInputValue("confirmPassword");

      if (!this._validatePasswordFields(current, newPass, confirm)) {
        return;
      }

      await this.apiService.updatePassword(current, newPass);
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.PASSWORD_UPDATED,
        "success",
        undefined,
        "security-section"
      );
      this._clearPasswordFields();
    } catch (error) {
      console.error("Failed to change password:", error);
      let errorMessage = APP_CONSTANTS.MESSAGES.PASSWORD_CHANGE_ERROR;
      if (error.message) {
        if (error.message.includes("Current password")) {
          errorMessage = "Current password is incorrect";
        } else {
          errorMessage = error.message;
        }
      }
      this.messageManager?.show(
        errorMessage,
        "error",
        undefined,
        "security-section"
      );
    }
  }

  /**
   * Exports user data
   */
  async exportData() {
    try {
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.EXPORT_PREPARING,
        "success",
        undefined,
        "account-section"
      );

      const settings = await this.apiService.getUserSettings();
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `user-data-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setTimeout(() => {
        this.messageManager?.show(
          APP_CONSTANTS.MESSAGES.EXPORT_READY,
          "success",
          undefined,
          "account-section"
        );
      }, 500);
    } catch (error) {
      console.error("Failed to export data:", error);
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.EXPORT_ERROR,
        "error",
        undefined,
        "account-section"
      );
    }
  }

  /**
   * Opens the delete account confirmation modal
   */
  openDeleteModal() {
    const modal = Utils.getElement("#deleteAccountModal");
    const input = Utils.getElement("#deleteConfirmInput");
    const confirmBtn = Utils.getElement(".delete-modal-confirm");

    if (!modal || !input || !confirmBtn) return;

    // Remove any existing input listeners by cloning (clean slate)
    const inputClone = input.cloneNode(true);
    input.parentNode.replaceChild(inputClone, input);
    const newInput = Utils.getElement("#deleteConfirmInput");

    // Setup input validation handler - use newInput reference
    const checkInput = () => {
      const currentValue = newInput.value.trim();
      const shouldEnable = currentValue === "DELETE";
      confirmBtn.disabled = !shouldEnable;
    };

    // Add event listeners
    newInput.addEventListener("input", checkInput);
    newInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !confirmBtn.disabled) {
        e.preventDefault();
        this.confirmDeleteAccount();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.closeDeleteModal();
      }
    });

    // Close on backdrop click (only add once)
    if (this.deleteModalBackdropHandler) {
      modal.removeEventListener("click", this.deleteModalBackdropHandler);
    }
    this.deleteModalBackdropHandler = (e) => {
      if (e.target === modal) {
        this.closeDeleteModal();
      }
    };
    modal.addEventListener("click", this.deleteModalBackdropHandler);

    // Show modal and reset state
    modal.classList.remove("hidden");
    newInput.value = "";
    confirmBtn.disabled = true;

    // Focus input after a brief delay to ensure modal is visible
    setTimeout(() => {
      newInput.focus();
    }, 100);

    // Reinitialize icons
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  /**
   * Closes the delete account confirmation modal
   */
  closeDeleteModal() {
    const modal = Utils.getElement("#deleteAccountModal");
    const input = Utils.getElement("#deleteConfirmInput");

    if (modal && input) {
      modal.classList.add("hidden");
      input.value = "";
    }
  }

  /**
   * Confirms and deletes user account
   */
  async confirmDeleteAccount() {
    const input = Utils.getElement("#deleteConfirmInput");
    if (!input || input.value.trim() !== "DELETE") {
      return;
    }

    this.closeDeleteModal();

    try {
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.DELETE_PROCESSING,
        "error",
        undefined,
        "account-section"
      );
      await this.apiService.deleteAccount();
      setTimeout(() => {
        window.location.href = "/auth";
      }, 2000);
    } catch (error) {
      console.error("Failed to delete account:", error);
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.DELETE_ERROR,
        "error",
        undefined,
        "account-section"
      );
    }
  }

  /**
   * Deletes user account (opens modal)
   */
  async deleteAccount() {
    this.openDeleteModal();
  }

  _validatePasswordFields(current, newPass, confirm) {
    if (!current || !newPass || !confirm) {
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.PASSWORD_REQUIRED,
        "error",
        undefined,
        "security-section"
      );
      return false;
    }

    if (newPass !== confirm) {
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.PASSWORD_MISMATCH,
        "error",
        undefined,
        "security-section"
      );
      return false;
    }

    if (newPass.length < APP_CONSTANTS.VALIDATION.MIN_PASSWORD_LENGTH) {
      this.messageManager?.show(
        APP_CONSTANTS.MESSAGES.PASSWORD_TOO_SHORT,
        "error",
        undefined,
        "security-section"
      );
      return false;
    }

    return true;
  }

  _clearPasswordFields() {
    this._setInputValue("currentPassword", "");
    this._setInputValue("newPassword", "");
    this._setInputValue("confirmPassword", "");
  }

  /**
   * Updates header user information display
   * @param {Object} userData - User data object
   * @private
   */
  _updateHeaderUserInfo(userData) {
    const userNameEl = Utils.getElement("#userName");
    const userTimezoneEl = Utils.getElement("#userTimezone");
    const userAvatarEl = Utils.getElement("#userAvatar");
    
    if (userNameEl && userData.name) {
      userNameEl.textContent = userData.name;
    }
    
    if (userTimezoneEl && userData.timezone) {
      // Convert IANA timezone format (e.g., "Asia/Singapore") to GMT format
      let timezoneDisplay = userData.timezone;
      
      if (timezoneDisplay.includes("/") || timezoneDisplay.includes("_")) {
        // Map common IANA timezones to GMT format
        const timezoneMap = {
          "Asia/Singapore": "GMT+8",
          "America/New_York": "GMT-5",
          "America/Los_Angeles": "GMT-8",
          "Europe/London": "GMT+0",
          "Europe/Paris": "GMT+1",
          "Asia/Tokyo": "GMT+9",
          "Australia/Sydney": "GMT+10",
        };
        timezoneDisplay = timezoneMap[timezoneDisplay] || "GMT+8";
      } else {
        // Extract GMT format if already in that format
        const timezoneMatch = timezoneDisplay.match(/GMT([+-]\d+)/);
        if (timezoneMatch) {
          timezoneDisplay = timezoneMatch[0];
        }
      }
      
      userTimezoneEl.textContent = timezoneDisplay;
    }

    // Update avatar if profilePictureUrl exists (for OAuth users)
    if (userAvatarEl) {
      // Ensure avatar is square (not circular)
      userAvatarEl.style.borderRadius = "0";
      
      if (userData.profilePictureUrl) {
        // Use profile picture if available
        userAvatarEl.innerHTML = `<img src="${userData.profilePictureUrl}" alt="${userData.name || 'User'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0;" onerror="this.style.display='none'; this.parentElement.textContent='${this._getInitials(userData.name)}';" />`;
      } else if (userData.name) {
        // Fallback to initials
        userAvatarEl.textContent = this._getInitials(userData.name);
      }
    }
  }

  /**
   * Gets user initials from name
   * @param {string} name - User's full name
   * @returns {string} Initials (e.g., "John Doe" -> "JD")
   * @private
   */
  _getInitials(name) {
    if (!name) return "";
    const nameParts = name.trim().split(' ');
    let initials = '';
    if (nameParts.length >= 2) {
      initials = nameParts[0][0] + nameParts[nameParts.length - 1][0];
    } else if (nameParts.length === 1) {
      initials = nameParts[0].substring(0, 2);
    }
    return initials.toUpperCase();
  }

  _getInputValue(id) {
    const element = Utils.getElement(`#${id}`);
    return element?.value || "";
  }

  _setInputValue(id, value) {
    const element = Utils.getElement(`#${id}`);
    if (element) element.value = value;
  }

  _getSelectValue(id) {
    const element = Utils.getElement(`#${id}`);
    return element?.value || "";
  }

  _setSelectValue(id, value) {
    const element = Utils.getElement(`#${id}`);
    if (element) {
      element.value = value;

      // Update the custom dropdown display to match the select value
      const dropdown = element.closest(".custom-dropdown");
      if (dropdown) {
        const button = dropdown.querySelector(".custom-dropdown-button");
        const valueSpan = button?.querySelector(".dropdown-value");
        const options = dropdown.querySelectorAll(".custom-dropdown-option");

        // Find the selected option text
        const selectedOption = element.querySelector(
          `option[value="${value}"]`
        );
        if (selectedOption && valueSpan) {
          valueSpan.textContent = selectedOption.textContent;
        }

        // Update the selected state of dropdown options
        options.forEach((option) => {
          if (option.dataset.value === value) {
            option.classList.add(SETTINGS_CONSTANTS.CLASSES.SELECTED);
          } else {
            option.classList.remove(SETTINGS_CONSTANTS.CLASSES.SELECTED);
          }
        });
      }
    }
  }

  _setCheckboxValue(id, value) {
    const element = Utils.getElement(`#${id}`);
    if (element) {
      element.checked = value;
    }
  }

  _getCheckboxValue(id) {
    const element = Utils.getElement(`#${id}`);
    return element ? element.checked : false;
  }

  /**
   * Saves notification preferences
   */
  async saveNotificationPreferences() {
    try {
      const preferences = {
        emailNotifications: this._getCheckboxValue("emailNotifications"),
        flightAlerts: this._getCheckboxValue("flightAlerts"),
        tripReminders: this._getCheckboxValue("tripReminders"),
        groupActivityNotifications: this._getCheckboxValue("groupActivityNotifications"),
        marketingEmails: this._getCheckboxValue("marketingEmails"),
      };

      await this.apiService.updateNotificationPreferences(preferences);
      this.messageManager?.show(
        "Notification preferences updated successfully.",
        "success",
        undefined,
        "notifications-section"
      );
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
      this.messageManager?.show(
        error.message || "Failed to save notification preferences",
        "error",
        undefined,
        "notifications-section"
      );
    }
  }

  /**
   * Saves privacy preferences
   */
  async savePrivacyPreferences() {
    try {
      const preferences = {
        profileVisibility: this._getCheckboxValue("profileVisibility"),
        activityStatusVisible: this._getCheckboxValue("activityStatusVisible"),
        allowDataAnalytics: this._getCheckboxValue("allowDataAnalytics"),
      };

      await this.apiService.updatePrivacyPreferences(preferences);
      this.messageManager?.show(
        "Privacy preferences updated successfully.",
        "success",
        undefined,
        "privacy-section"
      );
    } catch (error) {
      console.error("Failed to save privacy preferences:", error);
      this.messageManager?.show(
        error.message || "Failed to save privacy preferences",
        "error",
        undefined,
        "privacy-section"
      );
    }
  }
}

class SidebarManager {
  toggleSidebar() {
    if (window.innerWidth <= 768) return;

    const sidebar = Utils.getElement("#settingsSidebar");
    const toggle = Utils.getElement("#sidebarToggle");
    if (!sidebar || !toggle) return;

    const isExpanded = sidebar.classList.contains("expanded");
    sidebar.classList.toggle("expanded", !isExpanded);
    toggle.classList.toggle(SETTINGS_CONSTANTS.CLASSES.ACTIVE, !isExpanded);

    this._reinitializeIcons();
  }

  _reinitializeIcons() {
    setTimeout(() => {
      if (window.lucide?.createIcons) {
        window.lucide.createIcons();
      }
    }, 100);
  }
}

/**
 * Settings Controller
 * Main controller that orchestrates all settings page functionality
 * Follows Dependency Inversion Principle by depending on abstractions
 */
class SettingsController {
  /**
   * Creates a new SettingsController instance
   */
  constructor() {
    this.messageManager = new MessageManager(
      SETTINGS_CONSTANTS.SELECTORS.MESSAGE_CONTAINER
    );
    this.apiService = new UserSettingsApiService();
    this.dropdownManager = new DropdownManager();
    this.scrollNavManager = new ScrollNavigationManager();
    this.headerManager = new HeaderManager();
    this.userDropdownManager = new UserDropdownManager();
    this.avatarManager = new AvatarManager(this.messageManager);
    this.formManager = new SettingsFormManager(
      this.messageManager,
      this.apiService
    );
    this.sidebarManager = new SidebarManager();
  }

  /**
   * Initializes all settings page functionality
   */
  initialize() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this._initializeAll()
      );
    } else {
      this._initializeAll();
    }
  }

  /**
   * Initializes all managers and loads user settings
   * @private
   */
  async _initializeAll() {
    this.dropdownManager.initialize(this.messageManager);
    this.scrollNavManager.initialize();
    this.headerManager.initialize();
    this.userDropdownManager.initialize();
    this.avatarManager.initialize();
    this._initializeIcons();
    this._exposeGlobalFunctions();
    // Store reference to app instance for re-initialization after OAuth section hiding
    window.settingsApp = this;
    await this.formManager.loadUserSettings();
    this._setupPreferenceListeners();
  }

  /**
   * Sets up event listeners for notification and privacy preferences
   * @private
   */
  _setupPreferenceListeners() {
    // Notification preferences
    const notificationIds = [
      "emailNotifications",
      "flightAlerts",
      "tripReminders",
      "groupActivityNotifications",
      "marketingEmails",
    ];

    notificationIds.forEach((id) => {
      const checkbox = Utils.getElement(`#${id}`);
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          this.formManager.saveNotificationPreferences();
        });
      }
    });

    // Privacy preferences
    const privacyIds = [
      "profileVisibility",
      "activityStatusVisible",
      "allowDataAnalytics",
    ];

    privacyIds.forEach((id) => {
      const checkbox = Utils.getElement(`#${id}`);
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          this.formManager.savePrivacyPreferences();
        });
      }
    });
  }

  _initializeIcons() {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  /**
   * Exposes global functions for inline event handlers
   * @private
   */
  _exposeGlobalFunctions() {
    window.scrollToSection = (sectionId) =>
      this.scrollNavManager.scrollToSection(sectionId);
    window.saveProfile = () => this.formManager.saveProfile();
    window.resetProfile = () => this.formManager.resetProfile();
    window.savePreferences = () => {
      console.log("[CLIENT DEBUG] window.savePreferences called!");
      this.formManager.savePreferences();
    };
    window.changePassword = () => this.formManager.changePassword();
    window.exportData = () => this.formManager.exportData();
    window.deleteAccount = () => this.formManager.deleteAccount();
    window.closeDeleteModal = () => this.formManager.closeDeleteModal();
    window.confirmDeleteAccount = () => this.formManager.confirmDeleteAccount();
    window.toggleSidebar = () => this.sidebarManager.toggleSidebar();
  }
}

const settingsController = new SettingsController();
settingsController.initialize();
