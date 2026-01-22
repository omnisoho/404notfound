const CONFIG = {
  API_BASE: "/api/admin",
  ANIMATION_DURATION: 750,
  COLORS: {
    notion: {
      gray: "rgba(55, 53, 47, 0.16)",
      brown: "rgba(159, 107, 83, 0.8)",
      orange: "rgba(217, 115, 13, 0.8)",
      yellow: "rgba(203, 145, 47, 0.8)",
      green: "rgba(68, 131, 97, 0.8)",
      blue: "rgba(51, 126, 169, 0.8)",
      purple: "rgba(144, 101, 176, 0.8)",
      pink: "rgba(193, 76, 138, 0.8)",
      red: "rgba(212, 76, 71, 0.8)",
    },
    gradient: {
      blue: ["rgba(99, 102, 241, 0.8)", "rgba(59, 130, 246, 0.8)"],
      purple: ["rgba(168, 85, 247, 0.8)", "rgba(139, 92, 246, 0.8)"],
      green: ["rgba(34, 197, 94, 0.8)", "rgba(22, 163, 74, 0.8)"],
      orange: ["rgba(251, 146, 60, 0.8)", "rgba(249, 115, 22, 0.8)"],
    },
  },
};

class AuthService {
  static getToken() {
    return localStorage.getItem("authToken");
  }

  static getHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }
}

class NotificationService {
  static show(text, type = "info") {
    const container = document.getElementById("messageContainer");
    if (!container) return;

    const colors = {
      success: "bg-green-50 text-green-800 border-green-200",
      error: "bg-red-50 text-red-800 border-red-200",
      info: "bg-blue-50 text-blue-800 border-blue-200",
    };

    const message = document.createElement("div");
    message.className = `p-4 rounded-lg shadow-lg mb-3 border ${colors[type]}`;
    message.textContent = text;
    container.appendChild(message);

    setTimeout(() => {
      message.style.opacity = "0";
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }
}

class ChartManager {
  constructor() {
    this.instances = {};
  }

  destroy(chartId) {
    if (this.instances[chartId]) {
      this.instances[chartId].destroy();
      this.instances[chartId] = null;
    }
  }

  destroyAll() {
    Object.keys(this.instances).forEach((key) => this.destroy(key));
  }

  register(chartId, chartInstance) {
    this.instances[chartId] = chartInstance;
  }
}

class AnalyticsService {
  constructor() {
    this.chartManager = new ChartManager();
  }

  async fetchData(dateRange = "30d") {
    try {
      this.showLoading(true);
      const response = await fetch(
        `${CONFIG.API_BASE}/analytics?dateRange=${dateRange}`,
        { headers: AuthService.getHeaders() }
      );

      if (!response.ok) throw new Error("Failed to fetch analytics");

      const data = await response.json();
      this.renderCharts(data);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      NotificationService.show("Failed to load analytics data", "error");
    } finally {
      this.showLoading(false);
    }
  }

  showLoading(isLoading) {
    const charts = document.querySelectorAll(".chart-container");
    charts.forEach((chart) => {
      chart.style.opacity = isLoading ? "0.5" : "1";
      chart.style.pointerEvents = isLoading ? "none" : "auto";
    });
  }

  renderCharts(data) {
    this.chartManager.destroyAll();
    this.renderStatsCards(data);
    this.renderUserGrowthChart(data.userGrowth);
    this.renderRoleDistributionChart(data.roleDistribution);
    this.renderPersonaDistributionChart(data.personaDistribution);
    this.renderTripCreationChart(data.tripCreation);
  }

  renderStatsCards(data) {
    const container = document.getElementById("statsCards");
    if (!container) return;

    const totalUsers = data.summary?.totalUsers || 0;
    const totalTrips = data.summary?.totalTrips || 0;
    const roleCount = data.roleDistribution
      ? Object.keys(data.roleDistribution).length
      : 0;
    const personaCount = data.summary?.totalPersonas || 8;

    const stats = [
      {
        label: "Total Users",
        value: totalUsers,
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />',
        color: "rgba(99, 102, 241, 1)",
        bgColor: "rgba(99, 102, 241, 0.1)",
      },
      {
        label: "Total Trips",
        value: totalTrips,
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
        color: "rgba(34, 197, 94, 1)",
        bgColor: "rgba(34, 197, 94, 0.1)",
      },
      {
        label: "User Roles",
        value: roleCount,
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />',
        color: "rgba(168, 85, 247, 1)",
        bgColor: "rgba(168, 85, 247, 0.1)",
      },
      {
        label: "Personas",
        value: personaCount,
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />',
        color: "rgba(251, 146, 60, 1)",
        bgColor: "rgba(251, 146, 60, 0.1)",
      },
    ];

    container.innerHTML = stats
      .map(
        (stat) => `
        <div class="bg-sheet border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-muted uppercase tracking-wider mb-1">${stat.label}</p>
              <p class="text-2xl font-semibold text-ink">${stat.value}</p>
            </div>
            <div class="p-2.5 rounded-lg" style="background-color: ${stat.bgColor}">
              <svg class="w-5 h-5" fill="none" stroke="${stat.color}" viewBox="0 0 24 24">
                ${stat.icon}
              </svg>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  }

  getCommonOptions(type = "default") {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      animation: {
        duration: CONFIG.ANIMATION_DURATION,
        easing: "easeInOutQuart",
      },
      plugins: {
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleColor: "rgba(55, 53, 47, 1)",
          bodyColor: "rgba(55, 53, 47, 0.8)",
          borderColor: "rgba(55, 53, 47, 0.1)",
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 6,
          usePointStyle: true,
          titleFont: {
            size: 13,
            weight: "600",
            family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          },
          bodyFont: {
            size: 13,
            weight: "400",
            family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          },
          callbacks: {
            title: (items) => items[0]?.label || "",
            label: (context) => {
              let label = context.dataset.label || "";
              if (label) label += ": ";
              const value =
                context.parsed.y !== null
                  ? context.parsed.y
                  : context.parsed || 0;
              label += value;
              return label;
            },
          },
        },
      },
    };

    if (type === "line" || type === "bar") {
      baseOptions.scales = {
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            color: "rgba(55, 53, 47, 0.65)",
            font: {
              size: 11,
              family:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(55, 53, 47, 0.08)",
            drawBorder: false,
          },
          ticks: {
            color: "rgba(55, 53, 47, 0.65)",
            font: {
              size: 11,
              family:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            precision: 0,
          },
        },
      };
    }

    return baseOptions;
  }

  renderUserGrowthChart(data) {
    const ctx = document.getElementById("userGrowthChart");
    if (!ctx || !data) return;

    const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, "rgba(99, 102, 241, 0.3)");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0.01)");

    const options = this.getCommonOptions("line");
    options.plugins.legend = { display: false };

    this.chartManager.register(
      "userGrowth",
      new Chart(ctx, {
        type: "line",
        data: {
          labels: data.labels,
          datasets: [
            {
              label: "New Users",
              data: data.data,
              borderColor: "rgba(99, 102, 241, 1)",
              backgroundColor: gradient,
              borderWidth: 2.5,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: "rgba(99, 102, 241, 1)",
              pointHoverBorderColor: "#fff",
              pointHoverBorderWidth: 2,
            },
          ],
        },
        options,
      })
    );
  }

  renderRoleDistributionChart(data) {
    const ctx = document.getElementById("roleDistributionChart");
    if (!ctx || !data) return;

    const labels = Object.keys(data);
    const values = Object.values(data);
    const colors = [
      "rgba(99, 102, 241, 0.9)",
      "rgba(168, 85, 247, 0.9)",
      "rgba(236, 72, 153, 0.9)",
    ];

    const options = this.getCommonOptions("doughnut");
    options.plugins.legend = {
      display: true,
      position: "bottom",
      labels: {
        padding: 16,
        usePointStyle: true,
        pointStyle: "circle",
        font: {
          size: 12,
          family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        color: "rgba(55, 53, 47, 0.8)",
      },
    };
    options.plugins.tooltip.callbacks = {
      label: (context) => {
        const label = context.label || "";
        const value = context.parsed || 0;
        return `${label}: ${value}`;
      },
    };
    options.cutout = "65%";

    this.chartManager.register(
      "roleDistribution",
      new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: labels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)),
          datasets: [
            {
              data: values,
              backgroundColor: colors.slice(0, labels.length),
              borderWidth: 0,
              hoverOffset: 8,
            },
          ],
        },
        options,
      })
    );
  }

  renderPersonaDistributionChart(data) {
    const ctx = document.getElementById("personaDistributionChart");
    if (!ctx || !data || !Array.isArray(data)) return;

    const labels = data.map((p) => p.name);
    const values = data.map((p) => p.count);
    const maxValue = Math.max(...values);
    const colors = values.map((val) => {
      const intensity = val / maxValue;
      return `rgba(168, 85, 247, ${0.5 + intensity * 0.4})`;
    });

    const options = this.getCommonOptions("bar");
    options.plugins.legend = { display: false };
    options.plugins.tooltip.callbacks.label = (context) => {
      return `Users: ${context.parsed.y}`;
    };

    this.chartManager.register(
      "personaDistribution",
      new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Users",
              data: values,
              backgroundColor: colors,
              borderRadius: 6,
              borderSkipped: false,
              barThickness: "flex",
              maxBarThickness: 40,
            },
          ],
        },
        options,
      })
    );
  }

  renderTripCreationChart(data) {
    const ctx = document.getElementById("tripCreationChart");
    if (!ctx || !data) return;

    const options = this.getCommonOptions("bar");
    options.plugins.legend = { display: false };
    options.plugins.tooltip.callbacks.label = (context) => {
      return `Trips Created: ${context.parsed.y}`;
    };

    this.chartManager.register(
      "tripCreation",
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.labels,
          datasets: [
            {
              label: "New Trips",
              data: data.data,
              backgroundColor: "rgba(34, 197, 94, 0.85)",
              borderRadius: 6,
              borderSkipped: false,
              barThickness: "flex",
              maxBarThickness: 50,
            },
          ],
        },
        options,
      })
    );
  }
}

const analyticsService = new AnalyticsService();

class CustomDropdown {
  constructor(triggerId, menuId, onSelect) {
    this.trigger = document.getElementById(triggerId);
    this.menu = document.getElementById(menuId);
    this.chevron = this.trigger?.querySelector(".dropdown-chevron");
    this.onSelect = onSelect;
    this.isOpen = false;
    this.selectedValue = "30d";
    this.init();
  }

  init() {
    if (!this.trigger || !this.menu) return;

    this.trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.menu.querySelectorAll(".dropdown-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        const value = option.dataset.value;
        const textDiv = option.querySelector("div > div");
        const label = textDiv?.textContent.trim() || "";
        this.select(value, label);
      });

      option.addEventListener("mouseenter", () => {
        if (!option.classList.contains("is-selected")) {
          option.style.backgroundColor = "rgba(55, 53, 47, 0.06)";
        }
      });

      option.addEventListener("mouseleave", () => {
        if (!option.classList.contains("is-selected")) {
          option.style.backgroundColor = "transparent";
        }
      });
    });

    document.addEventListener("click", () => {
      if (this.isOpen) this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.menu.style.pointerEvents = "auto";
    this.menu.style.opacity = "1";
    this.menu.style.transform = "scale(1)";

    if (this.chevron) {
      this.chevron.style.transform = "rotate(180deg)";
    }

    this.trigger.style.borderColor = "rgba(55, 53, 47, 0.3)";
    this.trigger.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
  }

  close() {
    this.isOpen = false;
    this.menu.style.opacity = "0";
    this.menu.style.transform = "scale(0.95)";

    if (this.chevron) {
      this.chevron.style.transform = "rotate(0deg)";
    }

    this.trigger.style.borderColor = "";
    this.trigger.style.boxShadow = "";

    setTimeout(() => {
      if (!this.isOpen) {
        this.menu.style.pointerEvents = "none";
      }
    }, 150);
  }

  select(value, label) {
    this.selectedValue = value;
    const triggerText = this.trigger.querySelector(".dropdown-text");
    if (triggerText) triggerText.textContent = label;

    this.menu.querySelectorAll(".dropdown-option").forEach((opt) => {
      const isSelected = opt.dataset.value === value;
      const checkIcon = opt.querySelector(".check-icon");

      if (isSelected) {
        opt.classList.add("is-selected");
        opt.style.backgroundColor = "rgba(55, 53, 47, 0.06)";
        if (checkIcon) checkIcon.style.opacity = "1";
      } else {
        opt.classList.remove("is-selected");
        opt.style.backgroundColor = "transparent";
        if (checkIcon) checkIcon.style.opacity = "0";
      }
    });

    this.close();
    if (this.onSelect) this.onSelect(value);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  analyticsService.fetchData("30d");

  new CustomDropdown("dateRangeDropdown", "dateRangeMenu", (value) => {
    analyticsService.fetchData(value);
  });
});
