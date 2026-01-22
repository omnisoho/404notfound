const API_BASE = '/api/main_dashboard';
let userCurrency = 'USD';
let allTrips = { myTrips: [], invitedTrips: [] };
let selectedTrip = null;

// Load trips from API
async function loadTrips() {
  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(API_BASE, {
      headers: headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/auth';
        return;
      }
      throw new Error(`Failed to fetch trips: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Loaded trips data:', data);
    
    userCurrency = data.userCurrency || 'USD';
    allTrips = { 
      myTrips: Array.isArray(data.myTrips) ? data.myTrips : [], 
      invitedTrips: Array.isArray(data.invitedTrips) ? data.invitedTrips : [] 
    };
    
    console.log('Processed trips:', allTrips);
    
    renderSidebar();
    updateTripCounts();
  } catch (error) {
    console.error('Error loading trips:', error);
    // Show error to user
    const sidebarEmptyState = document.getElementById('sidebarEmptyState');
    if (sidebarEmptyState) {
      sidebarEmptyState.classList.remove('hidden');
      sidebarEmptyState.innerHTML = `
        <p class="text-sm text-red-600 text-center">Error loading trips: ${error.message}</p>
        <button onclick="location.reload()" class="mt-3 text-sm text-navy hover:underline">
          Reload page
        </button>
      `;
    }
  }
}

// Render sidebar with trip list
function renderSidebar(searchQuery = '') {
  const myTripsList = document.getElementById('myTripsList');
  const invitedTripsList = document.getElementById('invitedTripsList');
  const myTripsSection = document.getElementById('myTripsSection');
  const invitedTripsSection = document.getElementById('invitedTripsSection');
  const sidebarEmptyState = document.getElementById('sidebarEmptyState');
  
  if (!myTripsList || !invitedTripsList || !myTripsSection || !invitedTripsSection || !sidebarEmptyState) {
    console.error('Missing sidebar DOM elements');
    return;
  }
  
  // Filter trips based on search
  const filteredMyTrips = filterTrips(allTrips.myTrips, searchQuery);
  const filteredInvitedTrips = filterTrips(allTrips.invitedTrips, searchQuery);
  
  const hasTrips = allTrips.myTrips.length > 0 || allTrips.invitedTrips.length > 0;
  
  console.log('Rendering sidebar:', { hasTrips, myTrips: allTrips.myTrips.length, invitedTrips: allTrips.invitedTrips.length });
  
  // Show/hide empty state
  if (!hasTrips) {
    sidebarEmptyState.classList.remove('hidden');
    myTripsSection.classList.add('hidden');
    invitedTripsSection.classList.add('hidden');
  } else {
    sidebarEmptyState.classList.add('hidden');
    
    // Render My Trips
    if (allTrips.myTrips.length > 0) {
      myTripsSection.classList.remove('hidden');
      if (filteredMyTrips.length > 0) {
        myTripsList.innerHTML = renderSidebarTripList(filteredMyTrips, 'my');
      } else {
        myTripsList.innerHTML = '<div class="p-4 text-sm text-muted text-center">No trips match your search</div>';
      }
    } else {
      myTripsSection.classList.add('hidden');
    }
    
    // Render Invited Trips
    if (allTrips.invitedTrips.length > 0) {
      invitedTripsSection.classList.remove('hidden');
      if (filteredInvitedTrips.length > 0) {
        invitedTripsList.innerHTML = renderSidebarTripList(filteredInvitedTrips, 'invited');
      } else {
        invitedTripsList.innerHTML = '<div class="p-4 text-sm text-muted text-center">No trips match your search</div>';
      }
    } else {
      invitedTripsSection.classList.add('hidden');
    }
  }
  
  // Attach click handlers
  attachTripItemHandlers();
  lucide.createIcons();
}

// Filter trips by search query
function filterTrips(trips, query) {
  if (!query) return trips;
  const lowerQuery = query.toLowerCase();
  return trips.filter(trip => 
    trip.tripName.toLowerCase().includes(lowerQuery) ||
    trip.destinations.some(d => 
      d.city.toLowerCase().includes(lowerQuery) ||
      d.country.toLowerCase().includes(lowerQuery)
    )
  );
}

// Render sidebar trip list items
function renderSidebarTripList(trips, type) {
  if (!Array.isArray(trips) || trips.length === 0) {
    return '';
  }
  
  return trips.map(trip => {
    try {
      if (!trip || !trip.startDate || !trip.endDate) {
        console.warn('Invalid trip data:', trip);
        return '';
      }
      
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      const dateStr = formatDateRange(startDate, endDate);
      
      const destinations = Array.isArray(trip.destinations) ? trip.destinations : [];
      const cities = destinations.slice(0, 2).map(d => d?.city || '').filter(Boolean).join(', ');
      const moreCities = destinations.length > 2 ? ` +${destinations.length - 2}` : '';
      
      const statusClass = getStatusClass(trip.status || 'PLANNING');
      
      // Safely encode trip data for data attribute
      const tripDataJson = JSON.stringify(trip).replace(/"/g, '&quot;');
      
      return `
        <div class="sidebar-trip-item" data-trip-id="${trip.id}" data-trip-type="${type}" data-trip-data="${tripDataJson}">
          <div class="trip-item-name">${escapeHtml(trip.tripName || 'Unnamed Trip')}</div>
          <div class="trip-item-meta">${escapeHtml(dateStr)}${cities ? ` • ${escapeHtml(cities)}${moreCities}` : ''}</div>
          <span class="trip-item-badge ${statusClass}">${getStatusLabel(trip.status || 'PLANNING')}</span>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering trip:', trip, error);
      return '';
    }
  }).filter(Boolean).join('');
}

// Attach click handlers to trip items
function attachTripItemHandlers() {
  document.querySelectorAll('.sidebar-trip-item').forEach(item => {
    // Remove existing listeners by cloning
    const newItem = item.cloneNode(true);
    item.parentNode.replaceChild(newItem, item);
    
    newItem.addEventListener('click', () => {
      // Remove active class from all items
      document.querySelectorAll('.sidebar-trip-item').forEach(i => i.classList.remove('active'));
      
      // Add active class to clicked item
      newItem.classList.add('active');
      
      // Get trip data
      try {
        const tripDataJson = newItem.dataset.tripData.replace(/&quot;/g, '"');
        const tripData = JSON.parse(tripDataJson);
        selectedTrip = tripData;
        
        // Show trip details
        showTripDetails(tripData);
      } catch (error) {
        console.error('Error parsing trip data:', error);
      }
    });
  });
}

// Show trip details in main content area
function showTripDetails(trip) {
  const welcomeView = document.getElementById('welcomeView');
  const tripDetailView = document.getElementById('tripDetailView');
  
  welcomeView.classList.add('hidden');
  tripDetailView.classList.remove('hidden');
  
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const cities = trip.destinations.map(d => d.city).join(', ');
  
  // Update header
  document.getElementById('tripDetailName').textContent = trip.tripName;
  document.getElementById('tripDetailDates').textContent = formatDateRange(startDate, endDate);
  document.getElementById('tripDetailDestinations').textContent = cities;
  
  // Update status badge
  const statusBadge = document.getElementById('tripDetailStatus');
  const statusClass = getStatusClass(trip.status);
  const statusLabel = getStatusLabel(trip.status);
  statusBadge.className = `status-badge ${statusClass}`;
  statusBadge.textContent = statusLabel;
  
  // Update progress bar
  const progressBar = document.getElementById('tripProgressBar');
  if (trip.status === 'IN_PROGRESS') {
    const now = new Date();
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    let progress = Math.round((elapsed / totalDuration) * 100);
    progress = Math.max(0, Math.min(100, progress));
    progressBar.innerHTML = `
      <div class="trip-progress-fill" style="width: ${progress}%"></div>
    `;
  } else {
    progressBar.innerHTML = '';
  }
  
  // Update stats
  document.getElementById('tripDetailDuration').textContent = `${days} ${days === 1 ? 'day' : 'days'}`;
  document.getElementById('tripDetailBudget').textContent = trip.budgetTotal 
    ? formatCurrency(trip.budgetTotal, trip.currency)
    : 'Not set';
  document.getElementById('tripDetailDestCount').textContent = `${trip.destinations.length} ${trip.destinations.length === 1 ? 'destination' : 'destinations'}`;
  document.getElementById('tripDetailMembers').textContent = trip.membersCount || '1'; // TODO: Get actual member count
  
  // Update destinations list
  const destinationsList = document.getElementById('tripDetailDestinationsList');
  destinationsList.innerHTML = trip.destinations.map(dest => `
    <div class="destination-item">
      <div class="destination-item-icon">
        <i data-lucide="map-pin" class="w-4 h-4"></i>
      </div>
      <div class="destination-item-info">
        <div class="destination-item-city">${escapeHtml(dest.city)}</div>
        <div class="destination-item-country">${escapeHtml(dest.country)}</div>
      </div>
    </div>
  `).join('');
  
  // Update "Open" button
  const openTripBtn = document.getElementById('openTripBtn');
  openTripBtn.href = `/travelDashboard.html?tripName=${encodeURIComponent(trip.tripName)}`;
  
  lucide.createIcons();
}

// Show welcome view
function showWelcomeView() {
  const welcomeView = document.getElementById('welcomeView');
  const tripDetailView = document.getElementById('tripDetailView');
  
  welcomeView.classList.remove('hidden');
  tripDetailView.classList.add('hidden');
  
  // Remove active class from all trip items
  document.querySelectorAll('.sidebar-trip-item').forEach(item => item.classList.remove('active'));
  selectedTrip = null;
}

// Update trip counts
function updateTripCounts() {
  document.getElementById('myTripsCount').textContent = allTrips.myTrips.length;
  document.getElementById('invitedTripsCount').textContent = allTrips.invitedTrips.length;
}

// Helper functions
function getStatusClass(status) {
  const statusMap = {
    PLANNING: 'planning',
    PLANNING_COMPLETE: 'ready',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed'
  };
  return statusMap[status] || 'planning';
}

function getStatusLabel(status) {
  const statusMap = {
    PLANNING: 'Planning',
    PLANNING_COMPLETE: 'Ready',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed'
  };
  return statusMap[status] || 'Planning';
}

function formatDateRange(start, end) {
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Search functionality
document.getElementById('tripSearch').addEventListener('input', (e) => {
  renderSidebar(e.target.value);
});

// Back button
document.getElementById('backToOverview').addEventListener('click', () => {
  showWelcomeView();
});

// Modal handling
const modal = document.getElementById('createTripModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const createTripBtn = document.getElementById('createTripBtn');
const closeModalBtn = document.getElementById('closeModal');

function openModal() {
  modal.style.display = 'flex';
  modal.classList.remove('closing');
  
  // Force reflow to trigger animation
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });
  
  // Set currency from user preferences (as default, but trip-specific)
  const currencySelect = document.getElementById('currency');
  if (currencySelect) {
    currencySelect.value = userCurrency || 'USD';
    // Update dropdown display value
    const dropdown = currencySelect.closest('.custom-dropdown');
    if (dropdown) {
      const valueSpan = dropdown.querySelector('.dropdown-value');
      const selectedOption = currencySelect.querySelector(`option[value="${userCurrency || 'USD'}"]`);
      const options = dropdown.querySelectorAll('.custom-dropdown-option');
      options.forEach(opt => opt.classList.remove('selected'));
      const selectedOptionDiv = dropdown.querySelector(`.custom-dropdown-option[data-value="${userCurrency || 'USD'}"]`);
      if (selectedOptionDiv) {
        selectedOptionDiv.classList.add('selected');
      }
      if (valueSpan && selectedOption) {
        valueSpan.textContent = selectedOption.textContent;
      }
    }
  }
  
  // Initialize dropdowns and date pickers after modal opens
  setTimeout(() => {
    initializeDropdowns();
    initializeDatePickers();
    lucide.createIcons();
  }, 50);
}

function closeModal() {
  if (!modal.classList.contains('active')) return;
  
  modal.classList.add('closing');
  modal.classList.remove('active');
  
  setTimeout(() => {
    modal.classList.remove('closing');
    modal.style.display = 'none';
    document.getElementById('createTripForm').reset();
    hideError();
    resetDestinations();
    // Close any open date pickers
    document.querySelectorAll('[id$="DatePicker"]').forEach(picker => {
      picker.style.opacity = '0';
      picker.style.transform = 'scale(0.96) translateY(-8px)';
      picker.style.pointerEvents = 'none';
      setTimeout(() => {
        picker.classList.add('date-picker-hidden');
      }, 200);
    });
    // Close any open dropdowns
    document.querySelectorAll('.custom-dropdown-button.active').forEach(btn => {
      btn.classList.remove('active');
      btn.closest('.custom-dropdown')?.querySelector('.custom-dropdown-menu')?.classList.remove('active');
      btn.closest('.custom-dropdown')?.classList.remove('dropdown-open');
    });
  }, 200);
}

function resetDestinations() {
  const container = document.getElementById('destinationsContainer');
  container.innerHTML = `
    <div class="destination-entry" style="opacity: 1; transform: translateY(0);">
      <input type="text" placeholder="Country" class="destination-country form-input" required>
      <input type="text" placeholder="City" class="destination-city form-input" required>
      <button type="button" class="remove-destination hidden">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `;
  lucide.createIcons();
}

createTripBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

document.querySelectorAll('.create-trip-trigger').forEach(btn => {
  btn.addEventListener('click', openModal);
});

document.querySelectorAll('.close-modal-trigger').forEach(btn => {
  btn.addEventListener('click', closeModal);
});

// Error handling
function showError(message) {
  const errorAlert = document.getElementById('errorAlert');
  const errorList = document.getElementById('errorList');
  
  const errors = message.split(/[;,]/).map(e => e.trim()).filter(e => e);
  
  errorList.innerHTML = '';
  errors.forEach(error => {
    const li = document.createElement('li');
    li.textContent = error.replace('Invalid destinations: ', '');
    errorList.appendChild(li);
  });
  
  errorAlert.classList.remove('hidden');
  lucide.createIcons();
  errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  document.getElementById('errorAlert').classList.add('hidden');
}

document.getElementById('closeError').addEventListener('click', hideError);

// Helper function to animate modal height
function animateModalHeight() {
  const modalContainer = document.querySelector('.modal-container');
  const modalBody = document.querySelector('.modal-body');
  const modal = document.querySelector('.modal');
  
  if (!modalContainer || !modalBody || !modal || !modal.classList.contains('active')) {
    return;
  }
  
  // Capture current height
  const currentHeight = modalContainer.offsetHeight;
  
  // Save any existing inline styles
  const hadHeight = modalContainer.style.height;
  const hadTransition = modalContainer.style.transition;
  
  // Remove height and transition temporarily to measure natural size
  modalContainer.style.transition = 'none';
  modalContainer.style.height = '';
  
  // Force multiple reflows to ensure layout is stable
  void modalContainer.offsetHeight;
  void modalBody.offsetHeight;
  void modalContainer.offsetHeight;
  
  // Measure the natural content height
  // Sum all child heights for accuracy with flexbox
  const header = modalContainer.querySelector('.modal-header');
  const footer = modalContainer.querySelector('.modal-footer');
  const headerHeight = header ? header.offsetHeight : 0;
  const bodyHeight = modalBody.scrollHeight; // Use scrollHeight for body to include all content
  const footerHeight = footer ? footer.offsetHeight : 0;
  
  // Calculate total natural height
  const computedStyle = window.getComputedStyle(modalContainer);
  const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
  const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
  const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
  
  const naturalHeight = headerHeight + bodyHeight + footerHeight + paddingTop + paddingBottom + borderTop + borderBottom;
  const maxAllowedHeight = Math.floor(window.innerHeight * 0.9);
  const targetHeight = Math.min(naturalHeight, maxAllowedHeight);
  
  // Restore current height as starting point for animation
  modalContainer.style.height = `${currentHeight}px`;
  
  // Check if animation is needed
  const heightDiff = Math.abs(currentHeight - targetHeight);
  if (heightDiff > 2) {
    // Apply transition
    modalContainer.style.transition = 'height 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    
    // Force reflow to ensure transition is ready
    void modalContainer.offsetHeight;
    
    // Start animation in next frame
    requestAnimationFrame(() => {
      modalContainer.style.height = `${targetHeight}px`;
    });
    
    // Clean up after animation
    setTimeout(() => {
      modalContainer.style.height = '';
      modalContainer.style.transition = '';
    }, 250);
  } else {
    // No significant change
    modalContainer.style.height = hadHeight || '';
    modalContainer.style.transition = hadTransition || '';
  }
}

// Add destination
document.getElementById('addDestination').addEventListener('click', () => {
  const container = document.getElementById('destinationsContainer');
  const entry = document.createElement('div');
  entry.className = 'destination-entry';
  entry.innerHTML = `
    <input type="text" placeholder="Country" class="destination-country form-input" required>
    <input type="text" placeholder="City" class="destination-city form-input" required>
    <button type="button" class="remove-destination">
      <i data-lucide="trash-2" class="w-4 h-4"></i>
    </button>
  `;
  container.appendChild(entry);
  
  // Trigger animation by forcing reflow
  requestAnimationFrame(() => {
    entry.style.opacity = '1';
    entry.style.transform = 'translateY(0)';
  });
  
  lucide.createIcons();
  
  // Show remove button if more than one entry
  const entries = container.querySelectorAll('.destination-entry');
  if (entries.length > 1) {
    entries.forEach(e => e.querySelector('.remove-destination').classList.remove('hidden'));
  }
  
  // Animate modal height after entry is rendered and animated
  // Wait for entry animation to complete before measuring
  setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        animateModalHeight();
      });
    });
  }, 100);
  
  entry.querySelector('.remove-destination').addEventListener('click', () => {
    const currentHeight = document.querySelector('.modal-container')?.offsetHeight || 0;
    entry.classList.add('removing');
    
    // Calculate what the height will be after removal
    const entryHeight = entry.offsetHeight;
    const gap = parseFloat(getComputedStyle(container).gap) || 12;
    
    // Start removal animation
    setTimeout(() => {
      entry.remove();
      
      // Hide remove buttons if only one entry left
      const remainingEntries = container.querySelectorAll('.destination-entry');
      if (remainingEntries.length === 1) {
        remainingEntries[0].querySelector('.remove-destination').classList.add('hidden');
      }
      
      // Animate modal height after removal animation completes
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            animateModalHeight();
          });
        });
      }, 100);
    }, 200);
  });
});

// Form submission
document.getElementById('createTripForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const destinations = [];
  
  document.querySelectorAll('.destination-entry').forEach(entry => {
    const country = entry.querySelector('.destination-country').value.trim();
    const city = entry.querySelector('.destination-city').value.trim();
    if (country && city) {
      destinations.push({ country, city });
    }
  });
  
  if (destinations.length === 0) {
    showError('Please add at least one destination');
    return;
  }
  
  // Get date values from inputs (they might be text inputs now)
  const startDateValue = document.getElementById('startDate').value || selectedStartDate;
  const endDateValue = document.getElementById('endDate').value || selectedEndDate;
  
  const tripData = {
    tripName: formData.get('tripName'),
    startDate: startDateValue,
    endDate: endDateValue,
    budgetTotal: parseFloat(document.getElementById('budgetTotal').value) || 0,
    currency: formData.get('currency'),
    destinations
  };
  
  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(tripData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create trip');
    }
    
    closeModal();
    await loadTrips(); // Reload trips to show new one
  } catch (error) {
    console.error('Error creating trip:', error);
    showError(error.message || 'Failed to create trip. Please try again.');
  }
});

// Initialize user profile display
async function initializeUserProfile() {
  try {
    // Try to get user from storage first
    let user = null;
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (storedUser) {
      try {
        user = JSON.parse(storedUser);
      } catch (e) {
        console.warn('Failed to parse stored user data');
      }
    }

    // If no user in storage, fetch from API
    if (!user) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token && token !== 'null' && token !== 'undefined') {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/user/settings', {
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        user = await response.json();
        sessionStorage.setItem('user', JSON.stringify(user));
      }
    }

    // Update UI with user data
    const userName = document.getElementById('userName');
    const userTimezone = document.getElementById('userTimezone');
    const userAvatar = document.getElementById('userAvatar');

    if (userName && user?.name) {
      userName.textContent = user.name;
    }

    if (userTimezone && user?.timezone) {
      // Format timezone
      let timezoneDisplay = user.timezone;
      if (timezoneDisplay.includes('/') || timezoneDisplay.includes('_')) {
        const timezoneMap = {
          'Asia/Singapore': 'GMT+8',
          'America/New_York': 'GMT-5',
          'America/Los_Angeles': 'GMT-8',
          'Europe/London': 'GMT+0',
          'Europe/Paris': 'GMT+1',
          'Asia/Tokyo': 'GMT+9',
          'Australia/Sydney': 'GMT+10',
        };
        timezoneDisplay = timezoneMap[timezoneDisplay] || 'GMT+8';
      }
      userTimezone.textContent = timezoneDisplay;
    } else if (userTimezone) {
      // Use browser timezone as fallback
      const offset = new Date().getTimezoneOffset();
      const hours = Math.floor(Math.abs(offset) / 60);
      const sign = offset > 0 ? '-' : '+';
      userTimezone.textContent = `GMT${sign}${hours}`;
    }

    if (userAvatar && user?.name) {
      // Generate initials
      const parts = user.name.trim().split(/\s+/);
      const initials = parts.length >= 2 
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : user.name.substring(0, 2).toUpperCase();
      userAvatar.textContent = initials;
    }

    // Handle profile picture if available
    if (userAvatar && user?.profilePictureUrl) {
      userAvatar.innerHTML = `<img src="${user.profilePictureUrl}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0;">`;
    }
  } catch (error) {
    console.error('Error initializing user profile:', error);
  }
}

// Initialize user dropdown functionality
function initializeUserDropdown() {
  const userChip = document.getElementById('userChip');
  const userDropdown = document.getElementById('userDropdown');
  const userDropdownBackdrop = document.getElementById('userDropdownBackdrop');

  if (userChip && userDropdown) {
    userChip.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = !userDropdown.classList.contains('invisible');

      if (isVisible) {
        userDropdown.classList.add('invisible', 'opacity-0');
        userDropdown.classList.remove('active');
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.add('hidden');
          userDropdownBackdrop.classList.remove('active');
        }
      } else {
        userDropdown.classList.remove('invisible', 'opacity-0');
        userDropdown.classList.add('active');
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.remove('hidden');
          userDropdownBackdrop.classList.add('active');
        }
      }
    });

    if (userDropdownBackdrop) {
      userDropdownBackdrop.addEventListener('click', () => {
        userDropdown.classList.add('invisible', 'opacity-0');
        userDropdown.classList.remove('active');
        userDropdownBackdrop.classList.add('hidden');
        userDropdownBackdrop.classList.remove('active');
      });
    }

    // Handle dropdown item clicks
    const dropdownItems = userDropdown.querySelectorAll('.dropdown-item');
    dropdownItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const action = item.getAttribute('data-action');

        userDropdown.classList.add('invisible', 'opacity-0');
        userDropdown.classList.remove('active');
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.add('hidden');
          userDropdownBackdrop.classList.remove('active');
        }

        // Handle actions
        if (action === 'profile') {
          window.location.href = '/profile';
        } else if (action === 'settings') {
          window.location.href = '/settings';
        } else if (action === 'admin') {
          window.location.href = '/admin';
        } else if (action === 'logout') {
          // Clear storage and redirect to login
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/auth';
        }
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!userChip.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('invisible', 'opacity-0');
        userDropdown.classList.remove('active');
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.add('hidden');
          userDropdownBackdrop.classList.remove('active');
        }
      }
    });
  }
}

// Track initialized dropdowns to prevent duplicate listeners
const initializedDropdowns = new WeakSet();

// Initialize custom dropdowns
function initializeDropdowns() {
  const dropdowns = document.querySelectorAll('.custom-dropdown');
  
  dropdowns.forEach(dropdown => {
    // Skip if already initialized
    if (initializedDropdowns.has(dropdown)) return;
    
    const button = dropdown.querySelector('.custom-dropdown-button');
    const menu = dropdown.querySelector('.custom-dropdown-menu');
    const options = dropdown.querySelectorAll('.custom-dropdown-option');
    const select = dropdown.querySelector('select.form-select');
    const valueSpan = button?.querySelector('.dropdown-value');
    
    if (!button || !menu || !select) return;
    
    // Mark as initialized
    initializedDropdowns.add(dropdown);
    
    // Set initial value
    const selectedOption = select.querySelector('option:checked');
    if (selectedOption && valueSpan) {
      valueSpan.textContent = selectedOption.textContent;
    }
    
    // Mark selected option
    options.forEach(opt => {
      if (opt.dataset.value === select.value) {
        opt.classList.add('selected');
      }
    });
    
    // Button click handler
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = button.classList.contains('active');
      
      // Close all other dropdowns
      document.querySelectorAll('.custom-dropdown-button.active').forEach(btn => {
        if (btn !== button) {
          btn.classList.remove('active');
          btn.closest('.custom-dropdown')?.querySelector('.custom-dropdown-menu')?.classList.remove('active');
          btn.closest('.custom-dropdown')?.classList.remove('dropdown-open');
        }
      });
      
      if (isActive) {
        button.classList.remove('active');
        menu.classList.remove('active');
        dropdown.classList.remove('dropdown-open');
      } else {
        button.classList.add('active');
        menu.classList.add('active');
        dropdown.classList.add('dropdown-open');
      }
    });
    
    // Option click handlers
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.dataset.value;
        const text = option.textContent.trim();
        
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        
        if (valueSpan) {
          valueSpan.textContent = text;
        }
        
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        button.classList.remove('active');
        menu.classList.remove('active');
        dropdown.classList.remove('dropdown-open');
        
        lucide.createIcons();
      });
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown')) {
      document.querySelectorAll('.custom-dropdown-button.active').forEach(btn => {
        btn.classList.remove('active');
        btn.closest('.custom-dropdown')?.querySelector('.custom-dropdown-menu')?.classList.remove('active');
        btn.closest('.custom-dropdown')?.classList.remove('dropdown-open');
      });
    }
  });
}

// Date picker state
let startDatePickerMonth = new Date().getMonth();
let startDatePickerYear = new Date().getFullYear();
let endDatePickerMonth = new Date().getMonth();
let endDatePickerYear = new Date().getFullYear();
let selectedStartDate = null;
let selectedEndDate = null;

// Initialize date pickers
function initializeDatePickers() {
  initializeSingleDatePicker('start', startDatePickerMonth, startDatePickerYear);
  initializeSingleDatePicker('end', endDatePickerMonth, endDatePickerYear);
}

function initializeSingleDatePicker(prefix, initialMonth, initialYear) {
  const dateInput = document.getElementById(`${prefix}Date`);
  const datePicker = document.getElementById(`${prefix}DatePicker`);
  const datePickerDays = document.getElementById(`${prefix}DatePickerDays`);
  const datePickerMonthYear = document.getElementById(`${prefix}DatePickerMonthYear`);
  const prevMonthBtn = document.getElementById(`${prefix}DatePickerPrevMonth`);
  const nextMonthBtn = document.getElementById(`${prefix}DatePickerNextMonth`);
  const todayBtn = document.getElementById(`${prefix}DateToday`);
  const tomorrowBtn = document.getElementById(`${prefix}DateTomorrow`);

  if (!dateInput || !datePicker || !datePickerDays || !datePickerMonthYear) return;

  let currentMonth = initialMonth;
  let currentYear = initialYear;
  let selectedDate = prefix === 'start' ? selectedStartDate : selectedEndDate;

  function formatDateForDisplay(date) {
    if (!date) return "Select date";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function positionDatePicker() {
    if (!dateInput || !datePicker) return;
    const gap = 8;
    const padding = 16;
    const inputRect = dateInput.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const pickerWidth = 300;
    const pickerHeight = 380;

    let left = inputRect.left + (inputRect.width - pickerWidth) / 2;
    left = Math.max(padding, Math.min(left, viewportWidth - pickerWidth - padding));

    let top;
    const spaceBelow = viewportHeight - inputRect.bottom - padding;
    const spaceAbove = inputRect.top - padding;

    if (spaceBelow >= pickerHeight + gap) {
      top = inputRect.bottom + gap;
    } else if (spaceAbove >= pickerHeight + gap) {
      top = inputRect.top - pickerHeight - gap;
    } else {
      top = spaceBelow > spaceAbove ? inputRect.bottom + gap : padding;
    }

    top = Math.max(padding, Math.min(top, viewportHeight - pickerHeight - padding));
    const maxHeight = viewportHeight - 2 * padding;
    
    datePicker.style.setProperty("max-height", `${maxHeight}px`, "important");
    datePicker.style.setProperty("position", "fixed", "important");
    datePicker.style.setProperty("top", `${Math.round(top)}px`, "important");
    datePicker.style.setProperty("left", `${Math.round(left)}px`, "important");
    datePicker.style.setProperty("width", `${pickerWidth}px`, "important");
  }

  function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    datePickerMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    datePickerDays.innerHTML = "";
    datePickerDays.style.display = "grid";
    datePickerDays.style.gridTemplateColumns = "repeat(7, 1fr)";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "date-picker-day other-month";
      datePickerDays.appendChild(emptyDay);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement("button");
      dayElement.type = "button";
      dayElement.setAttribute("data-day", day);
      dayElement.textContent = day;

      const currentDate = new Date(currentYear, currentMonth, day);
      currentDate.setHours(0, 0, 0, 0);

      const isToday = currentDate.getTime() === today.getTime();
      const isSelected = selectedDate && currentDate.toISOString().split('T')[0] === selectedDate;
      const isPast = currentDate < today;

      if (isToday) dayElement.classList.add("today");
      if (isSelected) dayElement.classList.add("selected");
      if (isPast) {
        dayElement.classList.add("past");
        dayElement.disabled = true;
      }

      dayElement.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isPast) return;

        // Add selection animation
        dayElement.style.transform = 'scale(0.9)';
        setTimeout(() => {
          dayElement.style.transform = '';
        }, 150);

        const year = currentYear;
        const month = String(currentMonth + 1).padStart(2, "0");
        const dayStr = String(day).padStart(2, "0");
        selectedDate = `${year}-${month}-${dayStr}`;
        
        if (prefix === 'start') {
          selectedStartDate = selectedDate;
        } else {
          selectedEndDate = selectedDate;
        }
        
        dateInput.value = selectedDate;
        dateInput.placeholder = formatDateForDisplay(selectedDate);
        renderCalendar();
        
        // Close with animation
        datePicker.style.opacity = '0';
        datePicker.style.transform = 'scale(0.96) translateY(-8px)';
        datePicker.style.pointerEvents = 'none';
        setTimeout(() => {
          datePicker.classList.add("date-picker-hidden");
        }, 200);
      });

      datePickerDays.appendChild(dayElement);
    }

    // Empty cells for remaining days
    const remainingDays = 42 - (startingDayOfWeek + daysInMonth);
    for (let i = 0; i < remainingDays; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "date-picker-day other-month";
      datePickerDays.appendChild(emptyDay);
    }

    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  // Input click handler
  dateInput.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = datePicker.classList.contains("date-picker-hidden");
    
    // Close the other date picker if it's open
    const otherPrefix = prefix === 'start' ? 'end' : 'start';
    const otherDatePicker = document.getElementById(`${otherPrefix}DatePicker`);
    if (otherDatePicker && !otherDatePicker.classList.contains("date-picker-hidden")) {
      otherDatePicker.style.opacity = '0';
      otherDatePicker.style.transform = 'scale(0.96) translateY(-8px)';
      otherDatePicker.style.pointerEvents = 'none';
      setTimeout(() => {
        otherDatePicker.classList.add("date-picker-hidden");
      }, 200);
    }
    
    // Close dropdowns when opening date picker
    document.querySelectorAll('.custom-dropdown-button.active').forEach(btn => {
      btn.classList.remove('active');
      btn.closest('.custom-dropdown')?.querySelector('.custom-dropdown-menu')?.classList.remove('active');
      btn.closest('.custom-dropdown')?.classList.remove('dropdown-open');
    });
    
    if (isHidden) {
      // Position first
      positionDatePicker();
      
      // Remove hidden class - element will be visible but start at opacity 0
      datePicker.classList.remove("date-picker-hidden");
      
      // Force reflow to ensure initial state is applied
      void datePicker.offsetHeight;
      
      // CSS :not(.date-picker-hidden) will now apply and animate
      // The transition is already defined in CSS
    } else {
      // Start closing animation
      datePicker.style.opacity = '0';
      datePicker.style.transform = 'scale(0.96) translateY(-8px)';
      datePicker.style.pointerEvents = 'none';
      
      // Wait for animation then hide
      setTimeout(() => {
        datePicker.classList.add("date-picker-hidden");
      }, 200);
    }
  });

  // Navigation buttons
  prevMonthBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    if (prefix === 'start') {
      startDatePickerMonth = currentMonth;
      startDatePickerYear = currentYear;
    } else {
      endDatePickerMonth = currentMonth;
      endDatePickerYear = currentYear;
    }
    renderCalendar();
  });

  nextMonthBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    if (prefix === 'start') {
      startDatePickerMonth = currentMonth;
      startDatePickerYear = currentYear;
    } else {
      endDatePickerMonth = currentMonth;
      endDatePickerYear = currentYear;
    }
    renderCalendar();
  });

  // Today button
  todayBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Button press animation
    todayBtn.style.transform = 'scale(0.96)';
    setTimeout(() => {
      todayBtn.style.transform = '';
    }, 150);
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    selectedDate = `${year}-${month}-${day}`;
    
    if (prefix === 'start') {
      selectedStartDate = selectedDate;
    } else {
      selectedEndDate = selectedDate;
    }
    
    dateInput.value = selectedDate;
    dateInput.placeholder = formatDateForDisplay(selectedDate);
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    if (prefix === 'start') {
      startDatePickerMonth = currentMonth;
      startDatePickerYear = currentYear;
    } else {
      endDatePickerMonth = currentMonth;
      endDatePickerYear = currentYear;
    }
    renderCalendar();
    datePicker.style.opacity = '0';
    datePicker.style.transform = 'scale(0.96) translateY(-8px)';
    datePicker.style.pointerEvents = 'none';
    setTimeout(() => {
      datePicker.classList.add("date-picker-hidden");
    }, 200);
  });

  // Tomorrow button
  tomorrowBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Button press animation
    tomorrowBtn.style.transform = 'scale(0.96)';
    setTimeout(() => {
      tomorrowBtn.style.transform = '';
    }, 150);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    selectedDate = `${year}-${month}-${day}`;
    
    if (prefix === 'start') {
      selectedStartDate = selectedDate;
    } else {
      selectedEndDate = selectedDate;
    }
    
    dateInput.value = selectedDate;
    dateInput.placeholder = formatDateForDisplay(selectedDate);
    currentMonth = tomorrow.getMonth();
    currentYear = tomorrow.getFullYear();
    if (prefix === 'start') {
      startDatePickerMonth = currentMonth;
      startDatePickerYear = currentYear;
    } else {
      endDatePickerMonth = currentMonth;
      endDatePickerYear = currentYear;
    }
    renderCalendar();
    datePicker.style.opacity = '0';
    datePicker.style.transform = 'scale(0.96) translateY(-8px)';
    datePicker.style.pointerEvents = 'none';
    setTimeout(() => {
      datePicker.classList.add("date-picker-hidden");
    }, 200);
  });

  // Initial render
  renderCalendar();
}

// Global handler to close date pickers when clicking outside
document.addEventListener("click", (e) => {
  // Don't close if clicking inside any date picker or its input
  const isClickInsideDatePicker = e.target.closest('[id$="DatePicker"]') || 
                                   e.target.closest('[id$="DateInputContainer"]') ||
                                   (e.target.id.includes('Date') && (e.target.id.includes('Picker') || e.target.id.includes('Input')));
  
  if (!isClickInsideDatePicker) {
    document.querySelectorAll('[id$="DatePicker"]').forEach(picker => {
      if (!picker.classList.contains('date-picker-hidden')) {
        picker.style.opacity = '0';
        picker.style.transform = 'scale(0.96) translateY(-8px)';
        picker.style.pointerEvents = 'none';
        setTimeout(() => {
          picker.classList.add('date-picker-hidden');
        }, 200);
      }
    });
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
  await initializeUserProfile();
  initializeUserDropdown();
  initializeDropdowns();
  await loadTrips();
});
