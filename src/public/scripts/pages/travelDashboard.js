const apiUrl = '.';

console.log('=== Travel Dashboard Script Loaded ===');
console.log('Current URL:', window.location.href);
console.log('Query params:', window.location.search);

// Chart instances (created on DOMContentLoaded)
let stepsChart = null;
let categoryChart = null;

// keep a copy of the last full category data so checkboxes can filter the chart
let categoryDataFull = [];

function initCharts() {
  // create empty charts if canvas exists
  const stepsCtx = document.getElementById('stepsChart')?.getContext('2d');
  if (stepsCtx && !stepsChart && window.Chart) {
    stepsChart = new Chart(stepsCtx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Steps', data: [], borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.12)', fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#cbd5e1' } }, y: { ticks: { color: '#cbd5e1' } } } },
    });
  }

  const catCtx = document.getElementById('categoryChart')?.getContext('2d');
  if (catCtx && !categoryChart && window.Chart) {
    categoryChart = new Chart(catCtx, {
      type: 'doughnut',
      data: { labels: [], datasets: [{ label: 'Spending', data: [], backgroundColor: [] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } } },
    });
  }
}

function updateCharts(data) {
  // Steps chart (line)
  if (stepsChart && Array.isArray(data.steps)) {
    const labels = data.steps.map((s) => s.day);
    const values = data.steps.map((s) => Number(s.steps) || 0);
    stepsChart.data.labels = labels;
    stepsChart.data.datasets[0].data = values;
    stepsChart.update();
  }

  // Category chart (doughnut) - show actual spending per category
  if (categoryChart && Array.isArray(data.categoryCosts)) {
    const labels = data.categoryCosts.map((c) => c.category);
    const values = data.categoryCosts.map((c) => Number(c.actual) || 0);
    // store a full copy for filtering
    categoryDataFull = data.categoryCosts.map((c, i) => ({
      category: c.category,
      value: Number(c.actual) || 0,
      color: `hsl(${(i * 47) % 360} 80% 60% / 0.9)`,
    }));
    const palette = categoryDataFull.map((c) => c.color);
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = values;
    categoryChart.data.datasets[0].backgroundColor = palette;
    categoryChart.update();
  }
}

function getTripNameFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('tripName') || '';
}

function updateQueryString(tripName) {
  const params = new URLSearchParams(window.location.search);
  if (tripName) {
    params.set('tripName', tripName);
  } else {
    params.delete('tripName');
  }
  const newUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
}

function formatCurrency(amount) {
  if (typeof amount !== 'number') {
    return '—';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getStatusBadge(status) {
  const statusConfig = {
    PLANNING: { color: 'bg-blue-100 text-blue-800', label: 'Planning' },
    PLANNING_COMPLETE: { color: 'bg-green-100 text-green-800', label: 'Ready' },
    IN_PROGRESS: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
    COMPLETED: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
  };
  
  const config = statusConfig[status] || statusConfig.PLANNING;
  return `<span class="px-2 py-1 text-xs rounded-md ${config.color}">${config.label}</span>`;
}

function updateTripStatus(tripMeta) {
  const status = tripMeta?.status || 'PLANNING';
  const progress = tripMeta?.planningProgress || 0;
  const planningDetails = tripMeta?.planningDetails || {};
  
  // Update status badge
  const badgeEl = document.getElementById('tripStatusBadge');
  if (badgeEl) {
    badgeEl.innerHTML = getStatusBadge(status);
  }
  
  // Update status dropdown and enable only valid transitions
  const dropdown = document.getElementById('statusDropdown');
  if (dropdown) {
    dropdown.value = status;
    dropdown.setAttribute('data-current-status', status);
    
    // Define valid transitions
    const validTransitions = {
      PLANNING: ['PLANNING_COMPLETE', 'IN_PROGRESS'],
      PLANNING_COMPLETE: ['PLANNING', 'IN_PROGRESS'],
      IN_PROGRESS: ['COMPLETED'],
      COMPLETED: []
    };
    
    // Enable/disable options based on valid transitions
    const options = dropdown.querySelectorAll('option');
    options.forEach(option => {
      const optionValue = option.value;
      if (optionValue === status) {
        option.disabled = false; // Current status always enabled
      } else if (validTransitions[status]?.includes(optionValue)) {
        option.disabled = false; // Valid transition
      } else {
        option.disabled = true; // Invalid transition
      }
    });
  }
  
  // Show/hide planning section
  const planningSection = document.getElementById('planningSection');
  if (planningSection) {
    if (status === 'IN_PROGRESS') {
      planningSection.classList.remove('hidden');
      
      // Calculate trip progress based on dates
      const tripProgress = calculateTripProgress(tripMeta);
      
      // Update progress bar with safety checks
      const progressPercent = document.getElementById('planningProgressPercent');
      const progressBar = document.getElementById('planningProgressBar');
      if (progressPercent) progressPercent.textContent = `${tripProgress}%`;
      if (progressBar) progressBar.style.width = `${tripProgress}%`;
    } else {
      planningSection.classList.add('hidden');
    }
  }
}

function calculateTripProgress(tripMeta) {
  if (!tripMeta?.startDate || !tripMeta?.endDate) return 0;
  
  const now = new Date();
  const start = new Date(tripMeta.startDate);
  const end = new Date(tripMeta.endDate);
  
  // If trip hasn't started yet
  if (now < start) return 0;
  
  // If trip has ended
  if (now > end) return 100;
  
  // Calculate progress based on current date
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progress = Math.round((elapsed / totalDuration) * 100);
  
  return Math.max(0, Math.min(100, progress));
}

function updateChecklistItem(id, completed) {
  const item = document.getElementById(id);
  if (!item) return;
  
  const icon = item.querySelector('i');
  if (!icon) return;
  
  if (completed) {
    icon.setAttribute('data-lucide', 'check-circle');
    item.classList.remove('text-muted');
    item.classList.add('text-green-600');
  } else {
    icon.setAttribute('data-lucide', 'circle');
    item.classList.remove('text-green-600');
    item.classList.add('text-muted');
  }
  lucide.createIcons();
}

async function updateTripStatusAPI(newStatus) {
  try {
    const response = await fetch(`${apiUrl}/trip/${window.tripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update status');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating trip status:', error);
    throw error;
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text || '—';
  }
}

function renderCategoryTable(categories) {
  const tbody = document.getElementById('categoryTableBody');
  if (!tbody) return;

  if (!categories || !categories.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="py-4 text-center text-muted">No budget data</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = '';
  categories.forEach((category) => {
    const row = document.createElement('tr');
    const allocated = Number(category.allocated) || 0;
    const actual = Number(category.actual) || 0;
    const percentage = allocated > 0 ? ((actual / allocated) * 100).toFixed(0) : 0;
    const statusClass = actual > allocated ? 'text-red-600' : actual > allocated * 0.8 ? 'text-yellow-600' : 'text-green-600';
    
    row.className = 'border-b border-border';
    row.innerHTML = `
      <td class="py-3">${category.category}</td>
      <td class="py-3 text-right">${formatCurrency(allocated)}</td>
      <td class="py-3 text-right">${formatCurrency(actual)}</td>
      <td class="py-3 text-right ${statusClass}">${percentage}%</td>
    `;
    tbody.appendChild(row);
  });
}

function renderList(listId, items, emptyText, formatter) {
  const list = document.getElementById(listId);
  if (!list) return;

  if (!items || !items.length) {
    list.innerHTML = `<li class="text-sm text-muted">${emptyText}</li>`;
    return;
  }

  list.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'text-sm py-2 border-b border-border last:border-0';
    li.innerHTML = formatter(item);
    list.appendChild(li);
  });
}

function renderBadges(containerId, values) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!values || !values.length) {
    container.innerHTML = '<span class="text-xs text-muted">None yet</span>';
    return;
  }

  values.forEach((value) => {
    const span = document.createElement('span');
    span.className = 'px-3 py-1 bg-navy text-white text-xs rounded-full';
    span.textContent = value;
    container.appendChild(span);
  });
}

// Filter categoryChart to only show checked categories
function updateCategoryChartSelection() {
  if (!categoryChart || !categoryDataFull || !categoryDataFull.length) return;
  const checked = Array.from(document.querySelectorAll('.cat-checkbox')).filter((cb) => cb.checked).map((cb) => cb.getAttribute('data-category'));
  const filtered = categoryDataFull.filter((c) => checked.includes(c.category));
  categoryChart.data.labels = filtered.map((c) => c.category);
  categoryChart.data.datasets[0].data = filtered.map((c) => c.value);
  categoryChart.data.datasets[0].backgroundColor = filtered.map((c) => c.color);
  categoryChart.update();
}

function renderWeather(weather, weatherMessage = null) {
  const currentEl = document.getElementById('weatherCurrent');
  const outlookEl = document.getElementById('weatherOutlook');

  // Show message if weather is unavailable or partial
  if (weatherMessage) {
    const messageHtml = `<div class="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded text-sm text-yellow-800 mb-4">⚠️ ${weatherMessage}</div>`;
    if (currentEl) {
      currentEl.innerHTML = messageHtml;
    }
    if (!weather || !weather.current) {
      if (outlookEl) outlookEl.innerHTML = '';
      return;
    }
  }

  if (!weather || !weather.current) {
    if (currentEl) {
      currentEl.innerHTML = `
        <div class="text-center py-8">
          <i data-lucide="cloud" class="w-12 h-12 mx-auto mb-2 text-muted"></i>
          <p class="text-muted">No weather data</p>
        </div>`;
      lucide.createIcons();
    }
    if (outlookEl) outlookEl.innerHTML = '';
    return;
  }

  if (currentEl) {
    const current = weather.current;
    let html = `
      <div class="text-center mb-4">
        <div class="text-5xl font-bold text-navy mb-2">${current.temperatureC}°C</div>
        <div class="text-muted mb-1">${current.condition}</div>
        <div class="text-sm text-muted">Feels like ${current.feelsLikeC}°C · Humidity ${current.humidityPercent}%</div>
      </div>`;
    if (weatherMessage) {
      html = `<div class="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded text-sm text-yellow-800 mb-4">⚠️ ${weatherMessage}</div>` + html;
    }
    currentEl.innerHTML = html;
  }

  if (outlookEl && weather.outlook && weather.outlook.length > 0) {
    outlookEl.innerHTML = `
      <div class="space-y-2">
        <p class="text-sm font-medium mb-3">Forecast</p>
        ${weather.outlook.map(day => `
          <div class="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
            <span class="font-medium">${day.day}</span>
            <span class="text-muted">${day.summary}</span>
            <span>${day.min}° / ${day.max}°</span>
          </div>
        `).join('')}
      </div>`;
  }
}

function handleDashboardResponse(data) {
  setText('tripTitle', data.tripMeta?.title || 'Unknown Trip');
  const dateRange = data.tripMeta?.dateRange || '—';
  setText('tripDetails', dateRange);
  const cities = data.tripMeta?.cities?.join(', ') || '—';
  setText('tripCities', cities);
  
  // Store trip ID and dates globally
  if (data.tripMeta?.tripId) {
    window.tripId = data.tripMeta.tripId;
  }
  
  // Update trip status and planning progress
  updateTripStatus(data.tripMeta);
  
  // Store trip dates for date validation in modal
  if (data.tripMeta?.startDate && data.tripMeta?.endDate) {
    window.tripDateRange = {
      start: data.tripMeta.startDate,
      end: data.tripMeta.endDate
    };
  }
  
  setText('totalCost', formatCurrency(data.totals?.totalCost));
  setText('hoursTravelling', data.totals?.hoursTraveling ? `${data.totals.hoursTraveling}h` : '—');
  setText('distanceTravelled', data.totals?.distanceKm ? `${data.totals.distanceKm} km` : '—');
  setText('tripDuration', data.tripMeta?.days ? `${data.tripMeta.days} days` : '—');

  renderCategoryTable(data.categoryCosts);

  renderList(
    'stepsList',
    data.steps,
    'No steps tracked.',
    (entry) => `<strong>${entry.day}:</strong> ${entry.steps.toLocaleString()} steps`
  );

  renderWeather(data.weather, data.weatherMessage);

  // Handle personality profile
  const personalityContent = document.getElementById('personalityContent');
  const undefinedTravelerPrompt = document.getElementById('undefinedTravelerPrompt');
  
  if (data.personality) {
    const isUndefined = data.personality.archetype && 
                       data.personality.archetype.toLowerCase().includes('undefined');
    
    if (isUndefined) {
      // Show quiz prompt for undefined travelers
      personalityContent.classList.add('hidden');
      undefinedTravelerPrompt.classList.remove('hidden');
    } else {
      // Show normal personality profile
      personalityContent.classList.remove('hidden');
      undefinedTravelerPrompt.classList.add('hidden');
      setText('personalitySummary', `${data.personality.archetype} · ${data.personality.summary}`);
      renderBadges('personalityHighlights', data.personality.highlights);
      renderBadges('personalityGrowth', data.personality.growthAreas);
    }
  } else {
    // No personality data at all
    personalityContent.classList.remove('hidden');
    undefinedTravelerPrompt.classList.add('hidden');
    setText('personalitySummary', 'No profile.');
    renderBadges('personalityHighlights', []);
    renderBadges('personalityGrowth', []);
  }

  renderList(
    'insightsList',
    data.insights,
    'None available.',
    (insight) => `<span>${insight}</span>`
  );

  renderList(
    'alertsList',
    data.alerts,
    'No alerts.',
    (alert) => `<strong class="text-uppercase">${alert.level}</strong> · ${alert.title} – ${alert.detail}`
  );

  renderList(
    'attractionsList',
    data.attractions,
    'No recommendations yet.',
    (attraction) => `<strong>${attraction.name}</strong><br /><small>${attraction.reason}</small>`
  );

  // update charts with the received data
  try {
    updateCharts(data);
  } catch (err) {
    // non-fatal: chart updates should not block the dashboard
    console.warn('Chart update failed', err);
  }
}

function loadDashboard(tripName) {
  if (!tripName) {
    alert('Please enter a trip name.');
    return;
  }

  // Get token from localStorage (if "Remember Me" was checked)
  const token = localStorage.getItem('token');
  
  // Encode trip name for URL (handles spaces and special characters)
  const encodedTripName = encodeURIComponent(tripName);
  const url = `${apiUrl}/travel_dashboard/${encodedTripName}`;
  
  // Build headers - only add Authorization if token exists in localStorage
  const headers = {};
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  fetch(url, {
    headers: headers,
    credentials: 'include' // Important: Send HttpOnly cookies for OAuth users
  })
    .then((response) => {
      
      if (!response.ok) {
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('token');
          window.location.href = '/auth.html';
          return;
        }
        if (response.status === 403) {
          alert('You do not have permission to view this trip.');
          window.location.href = '/main_dashboard';
          return;
        }
        throw new Error(`Failed to fetch dashboard data. Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data) {
        handleDashboardResponse(data);
      }
    })
    .catch((error) => {
      console.error('Error loading dashboard:', error);
      alert('Unable to load dashboard. Please check the trip name and try again.');
    });
}

document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  initializeStepsModal();
  initializeNavigationButtons();
  initializeStatusControls();
  
  const initialTripName = getTripNameFromQuery();
  console.log('Trip name from URL:', initialTripName);

  // Load dashboard if trip name exists in URL
  if (initialTripName) {
    loadDashboard(initialTripName);
  } else {
    console.warn('No trip name provided in URL');
  }
});

// Initialize status update controls
function initializeStatusControls() {
  const updateStatusBtn = document.getElementById('updateStatusBtn');
  const statusDropdown = document.getElementById('statusDropdown');
  
  if (updateStatusBtn && statusDropdown) {
    updateStatusBtn.addEventListener('click', async () => {
      const newStatus = statusDropdown.value;
      const currentStatus = statusDropdown.getAttribute('data-current-status');
      
      if (newStatus === currentStatus) {
        alert('Status is already set to this value');
        return;
      }
      
      updateStatusBtn.disabled = true;
      updateStatusBtn.textContent = 'Updating...';
      
      try {
        await updateTripStatusAPI(newStatus);
        alert('Trip status updated successfully!');
        
        // Reload dashboard to show updated state
        const tripName = getTripNameFromQuery();
        if (tripName) {
          loadDashboard(tripName);
        }
      } catch (error) {
        alert(`Failed to update status: ${error.message}`);
        statusDropdown.value = currentStatus;
      } finally {
        updateStatusBtn.disabled = false;
        updateStatusBtn.textContent = 'Update Status';
      }
    });
  }
}

// Navigation Buttons for Packing List and Trip Members
function initializeNavigationButtons() {
  const packingListBtn = document.getElementById('packingListBtn');
  const tripMembersBtn = document.getElementById('tripMembersBtn');
  const viewFullBudgetBtn = document.getElementById('viewFullBudgetBtn');
  
  if (packingListBtn) {
    packingListBtn.addEventListener('click', () => {
      if (window.tripId) {
        window.location.href = `/packingListHTML/packingList.html?tripId=${encodeURIComponent(window.tripId)}`;
      } else {
        alert('Trip ID not found');
      }
    });
  }
  
  if (tripMembersBtn) {
    tripMembersBtn.addEventListener('click', () => {
      if (window.tripId) {
        window.location.href = `/packingListHTML/memberList.html?tripId=${encodeURIComponent(window.tripId)}`;
      } else {
        alert('Trip ID not found');
      }
    });
  }

  if (viewFullBudgetBtn) {
    viewFullBudgetBtn.addEventListener('click', () => {
      if (window.tripId) {
        window.location.href = `/budgetPlanner/budgetMain.html?tripId=${encodeURIComponent(window.tripId)}`;
      } else {
        alert('Trip ID not found');
      }
    });
  }

  const takeQuizBtn = document.getElementById('takeQuizBtn');
  if (takeQuizBtn) {
    takeQuizBtn.addEventListener('click', () => {
      window.location.href = '/quiz.html';
    });
  }
}

// Steps Modal Functionality
function initializeStepsModal() {
  const modal = document.getElementById('stepsModal');
  const addBtn = document.getElementById('addStepsBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  const form = document.getElementById('stepsForm');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      
      // Set date picker min/max based on trip dates
      const dateInput = document.getElementById('stepDate');
      if (dateInput && window.tripDateRange) {
        dateInput.min = window.tripDateRange.start;
        dateInput.max = window.tripDateRange.end;
      }
      
      lucide.createIcons();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      form.reset();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      form.reset();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveSteps();
    });
  }
}

async function saveSteps() {
  const tripName = getTripNameFromQuery();
  const date = document.getElementById('stepDate').value;
  const steps = parseInt(document.getElementById('stepCount').value, 10);

  if (!tripName || !date || isNaN(steps)) {
    alert('Please fill in all fields correctly.');
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/travel_dashboard/${encodeURIComponent(tripName)}/steps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date, steps }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save steps');
    }

    const result = await response.json();
    console.log('✅ Steps saved:', result);

    // Close modal and reset form
    document.getElementById('stepsModal').classList.add('hidden');
    document.getElementById('stepsForm').reset();

    // Reload dashboard to show updated data
    await loadDashboard(tripName);
  } catch (error) {
    console.error('Error saving steps:', error);
    alert(`Failed to save steps: ${error.message}`);
  }
}
