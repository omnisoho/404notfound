/**
 * Analytics Service Module
 * Single Responsibility: Handle analytics data visualization
 * Dependency Inversion: Depends on abstractions (Chart.js API)
 */

import { apiService } from "./api-service.js";
import { uiService } from "./ui-service.js";

class AnalyticsService {
  constructor() {
    this.charts = {};
  }

  /**
   * Fetches and renders all analytics
   */
  async fetchAndRenderAnalytics(dateRange = "30d") {
    try {
      console.log("[Analytics] Fetching analytics data for:", dateRange);
      const data = await apiService.getAnalytics(dateRange);
      console.log("[Analytics] Received data:", data);

      // Render all charts
      this.renderUserGrowthChart(data.userGrowth || {});
      this.renderTripCreationChart(data.tripCreation || {});
      this.renderActiveUsersChart(data.activeUsers || {});
      this.renderPersonaDistributionChart(data.personaDistribution || []);
      this.renderAnalyticsSummary(data.summary || {}, data.roleDistribution || {});

      console.log("[Analytics] Charts rendered successfully");
    } catch (error) {
      console.error("[Analytics] Error fetching analytics:", error);
      uiService.showMessage("Failed to load analytics data", "error");
    }
  }

  /**
   * Renders user growth chart
   */
  renderUserGrowthChart(data) {
    console.log("[Chart] renderUserGrowthChart called with:", data);
    const canvas = document.getElementById("userGrowthChart");

    if (!canvas) {
      console.error("[Chart] Canvas element 'userGrowthChart' not found!");
      return;
    }

    if (!window.Chart) {
      console.error("[Chart] Chart.js not loaded!");
      return;
    }

    const ctx = canvas.getContext("2d");

    // Destroy existing chart
    if (this.charts.userGrowth) {
      this.charts.userGrowth.destroy();
    }

    // Show empty state if no data
    if (!data || !data.labels || data.labels.length === 0) {
      console.log("[Chart] No user growth data available");
      this.showEmptyChartState(ctx, canvas, "No user growth data available");
      return;
    }

    console.log("[Chart] Creating user growth chart with:", data.labels.length, "data points");

    this.charts.userGrowth = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: "New Users",
            data: data.data || [],
            borderColor: "rgb(30, 58, 95)",
            backgroundColor: "rgba(30, 58, 95, 0.1)",
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "rgb(30, 58, 95)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            cornerRadius: 6,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false,
        },
      },
    });
  }

  /**
   * Renders trip creation chart
   */
  renderTripCreationChart(data) {
    const canvas = document.getElementById("tripCreationChart");
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext("2d");

    if (this.charts.tripCreation) {
      this.charts.tripCreation.destroy();
    }

    if (!data || !data.labels || data.labels.length === 0) {
      this.showEmptyChartState(ctx, canvas, "No trip data available");
      return;
    }

    this.charts.tripCreation = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: "Trips Created",
            data: data.data || [],
            backgroundColor: "rgba(30, 58, 95, 0.8)",
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            cornerRadius: 6,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  /**
   * Renders active users chart
   */
  renderActiveUsersChart(data) {
    const canvas = document.getElementById("activeUsersChart");
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext("2d");

    if (this.charts.activeUsers) {
      this.charts.activeUsers.destroy();
    }

    if (!data || !data.labels || data.labels.length === 0) {
      this.showEmptyChartState(ctx, canvas, "No active user data available");
      return;
    }

    this.charts.activeUsers = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: "Active Users",
            data: data.data || [],
            borderColor: "rgb(16, 185, 129)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "rgb(16, 185, 129)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            cornerRadius: 6,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  /**
   * Renders persona distribution chart
   */
  renderPersonaDistributionChart(data) {
    const canvas = document.getElementById("personaDistributionChart");
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext("2d");

    if (this.charts.personaDistribution) {
      this.charts.personaDistribution.destroy();
    }

    if (!data || data.length === 0) {
      this.showEmptyChartState(ctx, canvas, "No persona data available");
      return;
    }

    const colors = [
      "rgba(30, 58, 95, 0.8)",
      "rgba(139, 92, 246, 0.8)",
      "rgba(251, 191, 36, 0.8)",
      "rgba(16, 185, 129, 0.8)",
      "rgba(236, 72, 153, 0.8)",
      "rgba(59, 130, 246, 0.8)",
      "rgba(249, 115, 22, 0.8)",
      "rgba(168, 85, 247, 0.8)",
    ];

    this.charts.personaDistribution = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.name || d.archetype),
        datasets: [
          {
            data: data.map((d) => d.count),
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            cornerRadius: 6,
          },
        },
      },
    });
  }

  /**
   * Renders analytics summary cards
   */
  renderAnalyticsSummary(summary, roleDistribution) {
    const container = document.getElementById("analyticsSummary");
    if (!container) return;

    const { totalUsers = 0, totalTrips = 0, totalPersonas = 0, quizCompletionRate = 0 } = summary;

    // Build role breakdown text
    let roleBreakdown = "";
    if (roleDistribution && typeof roleDistribution === "object") {
      const entries = Object.entries(roleDistribution);
      if (entries.length > 0) {
        roleBreakdown = entries
          .map(([role, count]) => {
            const percentage = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : 0;
            return `${role}: ${count} (${percentage}%)`;
          })
          .join(" • ");
      } else {
        roleBreakdown = "No role data";
      }
    } else {
      roleBreakdown = "No role data";
    }

    container.innerHTML = `
      <div class="border border-[var(--border)] rounded-lg p-5 bg-[var(--canvas)] hover:border-[var(--navy)] transition-colors duration-300">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="h-8 w-8 rounded-sm bg-[var(--navy)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sheet)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p class="text-[0.6875rem] uppercase tracking-[0.3em] text-[var(--muted)] font-semibold">Users</p>
          </div>
        </div>
        <p class="text-3xl font-semibold mb-2 text-[var(--ink)]">${totalUsers.toLocaleString()}</p>
        <p class="text-xs text-[var(--muted)] leading-relaxed">${roleBreakdown}</p>
      </div>

      <div class="border border-[var(--border)] rounded-lg p-5 bg-[var(--canvas)] hover:border-[var(--navy)] transition-colors duration-300">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="h-8 w-8 rounded-sm bg-[var(--navy)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sheet)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </div>
            <p class="text-[0.6875rem] uppercase tracking-[0.3em] text-[var(--muted)] font-semibold">Trips</p>
          </div>
        </div>
        <p class="text-3xl font-semibold mb-2 text-[var(--ink)]">${totalTrips.toLocaleString()}</p>
        <p class="text-xs text-[var(--muted)] leading-relaxed">Total trips created</p>
      </div>

      <div class="border border-[var(--border)] rounded-lg p-5 bg-[var(--canvas)] hover:border-[var(--navy)] transition-colors duration-300">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="h-8 w-8 rounded-sm bg-[var(--navy)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sheet)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            </div>
            <p class="text-[0.6875rem] uppercase tracking-[0.3em] text-[var(--muted)] font-semibold">Quiz Rate</p>
          </div>
        </div>
        <p class="text-3xl font-semibold mb-2 text-[var(--ink)]">${quizCompletionRate.toFixed(1)}%</p>
        <p class="text-xs text-[var(--muted)] leading-relaxed">${totalPersonas} personas available</p>
      </div>
    `;
  }

  /**
   * Shows empty state for charts
   */
  showEmptyChartState(ctx, canvas, message) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "14px Inter";
    ctx.fillStyle = "var(--muted)";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  /**
   * Destroys all charts
   */
  destroyAllCharts() {
    Object.values(this.charts).forEach((chart) => {
      if (chart) chart.destroy();
    });
    this.charts = {};
  }
}

export const analyticsService = new AnalyticsService();
