/**
 * Message notification system for displaying user feedback
 * Handles creation, animation, and removal of notification messages
 * Supports relative positioning to specific sections
 */
class MessageManager {
  constructor(containerSelector) {
    this.globalContainer = Utils.getElement(containerSelector);
    if (!this.globalContainer) {
      console.warn(`Message container not found: ${containerSelector}`);
    }
    this.activeMessages = new Set();
    this.sectionContainers = new Map();
  }

  /**
   * Display a message to the user with smooth animations
   * @param {string} text - Message text to display
   * @param {string} type - Message type (success, error, warning, info)
   * @param {number} duration - Display duration in milliseconds (default: 4000)
   * @param {string} sectionId - Optional section ID to show message relative to that section
   */
  show(text, type = "success", duration = 4000, sectionId = null) {
    if (!text) return;

    // Get the appropriate container
    const container = sectionId
      ? this._getOrCreateSectionContainer(sectionId)
      : this.globalContainer;

    if (!container) return;

    const message = this._createMessageElement(text, type);
    container.appendChild(message);
    this.activeMessages.add(message);

    // Trigger entrance animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        message.classList.add("show");
      });
    });

    // Auto-remove message after duration
    setTimeout(() => {
      this._removeMessage(message);
    }, duration);
  }

  /**
   * Get or create a message container for a specific section
   * @private
   * @param {string} sectionId - Section ID to attach message to
   * @returns {HTMLElement|null} Container element
   */
  _getOrCreateSectionContainer(sectionId) {
    if (this.sectionContainers.has(sectionId)) {
      return this.sectionContainers.get(sectionId);
    }

    const section = Utils.getElement(`#${sectionId}`);
    if (!section) {
      console.warn(`Section not found: ${sectionId}`);
      return this.globalContainer;
    }

    // Use existing container if it exists in HTML, otherwise create one
    let container = section.querySelector(".section-message-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "section-message-container";
      const sectionHeader = section.querySelector(".section-header");
      if (sectionHeader) {
        // Insert right after section-header, before the next sibling (usually settings-card)
        section.insertBefore(container, sectionHeader.nextSibling);
      } else {
        // Fallback: insert at the beginning of the section
        section.insertBefore(container, section.firstChild);
      }
    }

    this.sectionContainers.set(sectionId, container);
    return container;
  }

  /**
   * Create message DOM element with proper structure
   * @private
   * @param {string} text - Message text
   * @param {string} type - Message type
   * @returns {HTMLElement} Message element
   */
  _createMessageElement(text, type) {
    const message = document.createElement("div");
    message.className = `message message-${type}`;
    message.setAttribute("role", "alert");
    message.setAttribute(
      "aria-live",
      type === "error" ? "assertive" : "polite"
    );

    // Create icon wrapper
    const iconWrapper = document.createElement("div");
    iconWrapper.className = "message-icon";

    // Create text wrapper
    const textWrapper = document.createElement("div");
    textWrapper.className = "message-text";
    textWrapper.textContent = text;

    message.appendChild(iconWrapper);
    message.appendChild(textWrapper);

    return message;
  }

  /**
   * Remove message with exit animation
   * @private
   * @param {HTMLElement} message - Message element to remove
   */
  _removeMessage(message) {
    if (!message || !this.activeMessages.has(message)) return;

    message.classList.remove("show");
    this.activeMessages.delete(message);

    // Remove from DOM after animation completes
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);

        // Clean up empty section containers
        const container = message.parentNode;
        if (
          container &&
          container.classList.contains("section-message-container") &&
          container.children.length === 0
        ) {
          container.remove();
        }
      }
    }, 500);
  }

  /**
   * Clear all active messages
   */
  clearAll() {
    this.activeMessages.forEach((message) => {
      this._removeMessage(message);
    });
  }
}
