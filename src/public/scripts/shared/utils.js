/**
 * Shared utility functions for DOM manipulation and common operations
 */

const Utils = {
  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Query selector with error handling
   * @param {string} selector - CSS selector
   * @param {Element} context - Context element (optional)
   * @returns {Element|null} Element or null
   */
  getElement(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      console.error(`Error querying selector ${selector}:`, error);
      return null;
    }
  },

  /**
   * Query selector all with error handling
   * @param {string} selector - CSS selector
   * @param {Element} context - Context element (optional)
   * @returns {NodeList} NodeList of elements
   */
  getElements(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      console.error(`Error querying selector ${selector}:`, error);
      return [];
    }
  },
};
