/**
 * UI Service Module
 * Single Responsibility: Handle all UI-related operations (messages, modals, etc.)
 */

class UiService {
  /**
   * Shows message to user
   */
  showMessage(message, type = "success") {
    // Use messageManager if available
    if (window.MessageManager) {
      window.MessageManager.show(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
      // Fallback to toast-like notification
      this.showToast(message, type);
    }
  }

  /**
   * Shows a simple toast notification
   */
  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `fixed top-24 right-5 z-50 max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0`;

    const colors = {
      success: "bg-green-500 text-white",
      error: "bg-red-500 text-white",
      warning: "bg-yellow-500 text-white",
      info: "bg-blue-500 text-white",
    };

    toast.className += ` ${colors[type] || colors.info}`;
    toast.textContent = message;
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(0)";
    }, 10);

    // Animate out and remove
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Shows a modal
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    requestAnimationFrame(() => {
      modal.classList.add("show");
    });
  }

  /**
   * Hides a modal
   */
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("show");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 250);
  }

  /**
   * Escapes HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Formats date to readable string
   */
  formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Formats date to relative time
   */
  formatRelativeTime(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return this.formatDate(dateString);
  }

  /**
   * Gets initials from name
   */
  getInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Animates a number update
   */
  animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const currentValue = parseInt(element.textContent) || 0;
    if (currentValue === targetValue) return;

    const duration = 600;
    const steps = 20;
    const stepDuration = duration / steps;
    const increment = (targetValue - currentValue) / steps;

    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;

      if (currentStep >= steps) {
        element.textContent = targetValue;
        clearInterval(interval);
      } else {
        const newValue = Math.round(currentValue + increment * currentStep);
        element.textContent = newValue;
      }
    }, stepDuration);
  }

  /**
   * Shows a loading spinner in an element
   */
  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-center justify-center py-12">
        <div class="spinner"></div>
      </div>
    `;
  }

  /**
   * Shows an error state in an element
   */
  showError(containerId, message = "Failed to load data") {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-4">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="text-sm text-[var(--muted)] mb-4">${this.escapeHtml(message)}</p>
        <button onclick="location.reload()" class="btn btn-secondary">Retry</button>
      </div>
    `;
  }
}

export const uiService = new UiService();
