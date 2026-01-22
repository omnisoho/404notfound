// ============================================================================
// CONSTANTS
// ============================================================================

const apiUrl = ".";

// ============================================================================
// APPLICATION STATE
// ============================================================================

let currentUser = null;
let profileUser = null;
let isEditMode = false;
let trips = [];
let photos = {};

// ============================================================================
// MOCK DATA (Will be replaced with API calls later)
// ============================================================================

const mockProfileUser = {
  id: "user-001",
  name: "Avery Tan",
  email: "avery.tan@example.com",
  profilePictureUrl: null,
  isOnline: true,
  lastActiveAt: new Date().toISOString(),
  createdAt: "2024-01-15T00:00:00Z",
};

const mockTrips = [
  {
    id: "trip-001",
    tripName: "Tokyo Spring Adventure",
    startDate: "2024-03-20",
    endDate: "2024-03-27",
    destinations: [
      { country: "Japan", city: "Tokyo" },
      { country: "Japan", city: "Kyoto" },
    ],
    isVisible: true,
    coverPhoto:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
    photoCount: 12,
  },
  {
    id: "trip-002",
    tripName: "European Summer",
    startDate: "2024-06-15",
    endDate: "2024-07-05",
    destinations: [
      { country: "France", city: "Paris" },
      { country: "Italy", city: "Rome" },
      { country: "Spain", city: "Barcelona" },
    ],
    isVisible: true,
    coverPhoto:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
    photoCount: 24,
  },
  {
    id: "trip-003",
    tripName: "Bali Retreat",
    startDate: "2024-02-10",
    endDate: "2024-02-17",
    destinations: [{ country: "Indonesia", city: "Bali" }],
    isVisible: false,
    coverPhoto: null,
    photoCount: 8,
  },
];

const mockPhotos = {
  "trip-001": [
    {
      id: "photo-001",
      imageUrl:
        "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
      isVisible: true,
    },
    {
      id: "photo-002",
      imageUrl:
        "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400",
      isVisible: true,
    },
    {
      id: "photo-003",
      imageUrl:
        "https://images.unsplash.com/photo-1528164344705-47542687000d?w=400",
      isVisible: false,
    },
  ],
  "trip-002": [
    {
      id: "photo-004",
      imageUrl:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
      isVisible: true,
    },
    {
      id: "photo-005",
      imageUrl:
        "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400",
      isVisible: true,
    },
  ],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { month: "short", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

function formatDateRange(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return `${start} - ${end}`;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  initializeUserDropdown();
  initializeProfile();
  initializeEditMode();
  initializePhotoLightbox();
  initializeScrollEffects();
});

// ============================================================================
// USER DROPDOWN
// ============================================================================

function initializeUserDropdown() {
  const userChip = document.getElementById("userChip");
  const userDropdown = document.getElementById("userDropdown");
  const userDropdownBackdrop = document.getElementById("userDropdownBackdrop");

  if (userChip && userDropdown) {
    userChip.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = userDropdown.classList.contains("active");

      if (isVisible) {
        userDropdown.classList.add("invisible", "opacity-0");
        userDropdown.classList.remove("active");
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.add("hidden");
        }
      } else {
        userDropdown.classList.remove("invisible", "opacity-0");
        userDropdown.classList.add("active");
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.remove("hidden");
        }
      }
    });

    if (userDropdownBackdrop) {
      userDropdownBackdrop.addEventListener("click", () => {
        userDropdown.classList.add("invisible", "opacity-0");
        userDropdown.classList.remove("active");
        userDropdownBackdrop.classList.add("hidden");
      });
    }

    // Handle dropdown item clicks
    const dropdownItems = userDropdown.querySelectorAll(".dropdown-item");
    dropdownItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const action = item.getAttribute("data-action");
        userDropdown.classList.add("invisible", "opacity-0");
        userDropdown.classList.remove("active");
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.add("hidden");
        }

        if (action === "profile") {
          // Already on profile page
        } else if (action === "settings") {
          window.location.href = "/settings";
        } else if (action === "logout") {
          // Handle logout
          if (window.AuthService && window.AuthService.logout) {
            window.AuthService.logout();
          } else {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/auth";
          }
        }
      });
    });
  }

  // Load current user for header
  loadCurrentUser();
}

async function loadCurrentUser() {
  try {
    // Try to get from sessionStorage first
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      updateUserHeader(currentUser);
      return;
    }

    // Fetch from API
    const response = await fetch("/api/user/settings", {
      credentials: "include",
    });

    if (response.ok) {
      currentUser = await response.json();
      sessionStorage.setItem("user", JSON.stringify(currentUser));
      updateUserHeader(currentUser);
    }
  } catch (error) {
    console.error("Error loading current user:", error);
  }
}

function updateUserHeader(user) {
  const userName = document.getElementById("userName");
  const userTimezone = document.getElementById("userTimezone");
  const userAvatar = document.getElementById("userAvatar");

  if (userName && user.name) {
    userName.textContent = user.name;
  }

  if (userTimezone && user.timezone) {
    // Convert IANA timezone to GMT format
    try {
      const date = new Date();
      const offset = date
        .toLocaleTimeString("en", {
          timeZoneName: "short",
          timeZone: user.timezone,
        })
        .split(" ")[2];
      if (offset && offset.startsWith("GMT")) {
        userTimezone.textContent = offset;
      } else {
        const offsetMinutes = date.getTimezoneOffset();
        const sign = offsetMinutes > 0 ? "-" : "+";
        const hours = Math.floor(Math.abs(offsetMinutes) / 60);
        userTimezone.textContent = `GMT${sign}${hours}`;
      }
    } catch (e) {
      userTimezone.textContent = user.timezone;
    }
  }

  if (userAvatar) {
    if (user.profilePictureUrl) {
      userAvatar.innerHTML = `<img src="${escapeHtml(
        user.profilePictureUrl
      )}" alt="${escapeHtml(
        user.name
      )}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0;" onerror="this.style.display='none'; this.parentElement.textContent='${getInitials(
        user.name
      )}';" />`;
    } else if (user.name) {
      userAvatar.textContent = getInitials(user.name);
    }
  }
}

// ============================================================================
// PROFILE INITIALIZATION
// ============================================================================

async function initializeProfile() {
  // Get user ID from URL (e.g., /profile/:userId or /profile for own profile)
  const pathParts = window.location.pathname.split("/");
  const userId = pathParts[2] || null;

  // Load profile data
  await loadProfile(userId);
  renderProfile();
}

async function loadProfile(userId) {
  try {
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/profile/${userId || 'me'}`);
    // profileUser = await response.json();
    // trips = await fetch(`/api/profile/${userId || 'me'}/trips`).then(r => r.json());

    // Using mock data for now
    profileUser = mockProfileUser;
    trips = mockTrips.filter((trip) => trip.isVisible);
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

function renderProfile() {
  renderProfileHeader();
  renderStatistics();
  renderAchievements();
  renderTrips();
}

function renderProfileHeader() {
  const profileAvatar = document.getElementById("profileAvatar");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileStatus = document.getElementById("profileStatus");
  const memberSince = document.getElementById("memberSince");
  const totalTrips = document.getElementById("totalTrips");
  const countriesVisited = document.getElementById("countriesVisited");
  const editProfileBtn = document.getElementById("editProfileBtn");

  if (profileAvatar && profileUser) {
    if (profileUser.profilePictureUrl) {
      profileAvatar.innerHTML = `<img src="${escapeHtml(
        profileUser.profilePictureUrl
      )}" alt="${escapeHtml(
        profileUser.name
      )}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0;" onerror="this.style.display='none'; this.parentElement.textContent='${getInitials(
        profileUser.name
      )}';" />`;
    } else {
      profileAvatar.textContent = getInitials(profileUser.name);
    }
  }

  if (profileName && profileUser) {
    profileName.textContent = profileUser.name;
  }

  if (profileEmail && profileUser) {
    profileEmail.textContent = profileUser.email || "";
  }

  if (profileStatus && profileUser) {
    if (profileUser.isOnline) {
      profileStatus.innerHTML = `
        <div class="status-dot"></div>
        <span class="text-sm text-muted">Active now</span>
      `;
    } else {
      const lastActive = new Date(profileUser.lastActiveAt);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastActive) / 60000);
      let timeAgo = "Just now";
      if (diffMinutes > 60) {
        const hours = Math.floor(diffMinutes / 60);
        timeAgo = `${hours}h ago`;
      } else if (diffMinutes > 0) {
        timeAgo = `${diffMinutes}m ago`;
      }
      profileStatus.innerHTML = `
        <div class="status-dot" style="background: var(--muted); animation: none;"></div>
        <span class="text-sm text-muted">Last seen ${timeAgo}</span>
      `;
    }
  }

  // Calculate stats for header
  const allTrips = mockTrips;
  const uniqueCountries = new Set();
  allTrips.forEach((trip) => {
    trip.destinations.forEach((d) => uniqueCountries.add(d.country));
  });

  if (memberSince && profileUser.createdAt) {
    const created = new Date(profileUser.createdAt);
    memberSince.textContent = `Member since ${created.getFullYear()}`;
  }

  if (totalTrips) {
    totalTrips.textContent = `${allTrips.length} trip${
      allTrips.length !== 1 ? "s" : ""
    }`;
  }

  if (countriesVisited) {
    countriesVisited.textContent = `${uniqueCountries.size} countr${
      uniqueCountries.size !== 1 ? "ies" : "y"
    }`;
  }

  // Show edit button only if viewing own profile
  if (
    editProfileBtn &&
    currentUser &&
    profileUser &&
    currentUser.id === profileUser.id
  ) {
    editProfileBtn.classList.remove("hidden");
  } else {
    editProfileBtn.classList.add("hidden");
  }
}

function renderTrips() {
  const tripsGrid = document.getElementById("tripsGrid");
  const emptyState = document.getElementById("emptyState");

  if (!tripsGrid) return;

  tripsGrid.innerHTML = "";

  if (trips.length === 0) {
    if (emptyState) {
      emptyState.classList.remove("hidden");
    }
    return;
  }

  if (emptyState) {
    emptyState.classList.add("hidden");
  }

  trips.forEach((trip) => {
    const tripCard = document.createElement("article");
    tripCard.className =
      "trip-card border border-border bg-sheet overflow-hidden cursor-pointer";
    tripCard.addEventListener("click", () => openTripPhotos(trip.id));

    const destinations = trip.destinations
      .map((d) => `${d.city}, ${d.country}`)
      .join(" • ");

    tripCard.innerHTML = `
      <div class="h-48 overflow-hidden bg-canvas">
        ${
          trip.coverPhoto
            ? `<img src="${escapeHtml(trip.coverPhoto)}" alt="${escapeHtml(
                trip.tripName
              )}" class="h-full w-full object-cover" />`
            : `<div class="flex h-full items-center justify-center text-muted"><i data-lucide="map" class="h-12 w-12"></i></div>`
        }
      </div>
      <div class="p-5">
        <h3 class="mb-2 font-display text-lg font-semibold">${escapeHtml(
          trip.tripName
        )}</h3>
        <p class="mb-3 text-sm text-muted">${escapeHtml(destinations)}</p>
        <p class="mb-3 text-xs uppercase tracking-[0.1em] text-muted">${formatDateRange(
          trip.startDate,
          trip.endDate
        )}</p>
        ${
          trip.photoCount > 0
            ? `<div class="flex items-center gap-2 text-xs text-muted">
                <i data-lucide="image" class="h-4 w-4"></i>
                <span>${trip.photoCount} photo${
                trip.photoCount !== 1 ? "s" : ""
              }</span>
              </div>`
            : ""
        }
      </div>
    `;

    tripsGrid.appendChild(tripCard);
  });

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function openTripPhotos(tripId) {
  // TODO: Implement photo gallery view
  console.log("Opening photos for trip:", tripId);
}

// ============================================================================
// STATISTICS
// ============================================================================

function calculateStatistics() {
  const allTrips = mockTrips;
  const visibleTrips = allTrips.filter((t) => t.isVisible);

  // Calculate days traveled
  let totalDays = 0;
  allTrips.forEach((trip) => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    totalDays += days;
  });

  // Calculate unique countries and cities
  const uniqueCountries = new Set();
  const uniqueCities = new Set();
  allTrips.forEach((trip) => {
    trip.destinations.forEach((d) => {
      uniqueCountries.add(d.country);
      uniqueCities.add(d.city);
    });
  });

  // Calculate total photos
  let totalPhotos = 0;
  visibleTrips.forEach((trip) => {
    totalPhotos += trip.photoCount || 0;
  });

  // Count visible photos
  let visiblePhotos = 0;
  Object.values(mockPhotos).forEach((photoArray) => {
    visiblePhotos += photoArray.filter((p) => p.isVisible).length;
  });

  return {
    totalTrips: allTrips.length,
    visibleTrips: visibleTrips.length,
    countries: uniqueCountries.size,
    cities: uniqueCities.size,
    daysTraveled: totalDays,
    totalPhotos: totalPhotos,
    visiblePhotos: visiblePhotos,
    flights: 0, // Will be populated from API later
  };
}

function renderStatistics() {
  const stats = calculateStatistics();

  // Update stat cards
  const statTotalTrips = document.getElementById("statTotalTrips");
  const statCountries = document.getElementById("statCountries");
  const statDaysTraveled = document.getElementById("statDaysTraveled");
  const statPhotos = document.getElementById("statPhotos");
  const statFlights = document.getElementById("statFlights");
  const statCities = document.getElementById("statCities");

  if (statTotalTrips) statTotalTrips.textContent = stats.totalTrips;
  if (statCountries) statCountries.textContent = stats.countries;
  if (statDaysTraveled) statDaysTraveled.textContent = stats.daysTraveled;
  if (statPhotos) statPhotos.textContent = stats.visiblePhotos;
  if (statFlights) statFlights.textContent = stats.flights;
  if (statCities) statCities.textContent = stats.cities;
}

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

function calculateAchievements() {
  const stats = calculateStatistics();
  const achievements = [];

  // First Trip
  if (stats.totalTrips >= 1) {
    achievements.push({
      id: "first-trip",
      title: "First Journey",
      description: "Completed your first trip",
      icon: "map",
      unlocked: true,
    });
  }

  // Explorer
  if (stats.countries >= 3) {
    achievements.push({
      id: "explorer",
      title: "Explorer",
      description: "Visited 3+ countries",
      icon: "globe",
      unlocked: true,
    });
  }

  // World Traveler
  if (stats.countries >= 10) {
    achievements.push({
      id: "world-traveler",
      title: "World Traveler",
      description: "Visited 10+ countries",
      icon: "compass",
      unlocked: true,
    });
  }

  // Photo Enthusiast
  if (stats.visiblePhotos >= 50) {
    achievements.push({
      id: "photo-enthusiast",
      title: "Photo Enthusiast",
      description: "Shared 50+ photos",
      icon: "image",
      unlocked: true,
    });
  }

  // Frequent Flyer
  if (stats.flights >= 10) {
    achievements.push({
      id: "frequent-flyer",
      title: "Frequent Flyer",
      description: "Tracked 10+ flights",
      icon: "plane",
      unlocked: true,
    });
  }

  // Long Journey
  if (stats.daysTraveled >= 30) {
    achievements.push({
      id: "long-journey",
      title: "Long Journey",
      description: "30+ days of travel",
      icon: "calendar",
      unlocked: true,
    });
  }

  // Add locked achievements for motivation
  if (stats.countries < 3) {
    achievements.push({
      id: "explorer-locked",
      title: "Explorer",
      description: "Visit 3+ countries",
      icon: "globe",
      unlocked: false,
    });
  }

  if (stats.visiblePhotos < 50) {
    achievements.push({
      id: "photo-enthusiast-locked",
      title: "Photo Enthusiast",
      description: "Share 50+ photos",
      icon: "image",
      unlocked: false,
    });
  }

  return achievements;
}

function renderAchievements() {
  const achievements = calculateAchievements();
  const achievementsGrid = document.getElementById("achievementsGrid");

  if (!achievementsGrid) return;

  achievementsGrid.innerHTML = "";

  if (achievements.length === 0) {
    achievementsGrid.innerHTML = `
      <div class="col-span-full text-center py-8 text-sm text-muted">
        No achievements yet. Start traveling to unlock achievements!
      </div>
    `;
    return;
  }

  achievements.forEach((achievement) => {
    const achievementCard = document.createElement("article");
    achievementCard.className = `achievement-badge border border-border bg-sheet p-4 text-center ${
      achievement.unlocked ? "" : "opacity-50"
    }`;

    achievementCard.innerHTML = `
      <div class="mb-3 flex justify-center">
        <div class="flex h-12 w-12 items-center justify-center border border-border ${
          achievement.unlocked ? "bg-navy text-sheet" : "bg-canvas"
        }">
          <i data-lucide="${achievement.icon}" class="h-6 w-6"></i>
        </div>
      </div>
      <h3 class="mb-1 text-sm font-semibold">${escapeHtml(
        achievement.title
      )}</h3>
      <p class="text-xs text-muted">${escapeHtml(achievement.description)}</p>
    `;

    achievementsGrid.appendChild(achievementCard);
  });

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

// ============================================================================
// EDIT MODE
// ============================================================================

function initializeEditMode() {
  const editProfileBtn = document.getElementById("editProfileBtn");
  const closeEditBtn = document.getElementById("closeEditBtn");
  const editOverlay = document.getElementById("editOverlay");

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      openEditMode();
    });
  }

  if (closeEditBtn) {
    closeEditBtn.addEventListener("click", () => {
      closeEditMode();
    });
  }

  if (editOverlay) {
    editOverlay.addEventListener("click", (e) => {
      if (e.target === editOverlay) {
        closeEditMode();
      }
    });
  }
}

async function openEditMode() {
  const editOverlay = document.getElementById("editOverlay");
  const editContent = document.getElementById("editContent");

  if (!editOverlay || !editContent) return;

  isEditMode = true;
  editOverlay.classList.add("active");

  // Load all trips for editing
  // TODO: Replace with actual API call
  // const allTrips = await fetch('/api/profile/me/trips').then(r => r.json());
  const allTrips = mockTrips;

  renderEditContent(allTrips);
}

function renderEditContent(allTrips) {
  const editContent = document.getElementById("editContent");
  if (!editContent) return;

  let html = "";

  allTrips.forEach((trip) => {
    const destinations = trip.destinations
      .map((d) => `${d.city}, ${d.country}`)
      .join(" • ");

    html += `
      <div class="visibility-toggle">
        <input
          type="checkbox"
          id="trip-${trip.id}"
          ${trip.isVisible ? "checked" : ""}
          onchange="toggleTripVisibility('${trip.id}', this.checked)"
        />
        <label for="trip-${trip.id}" class="visibility-toggle-label">
          <strong>${escapeHtml(trip.tripName)}</strong><br>
          <span style="font-size: 0.75rem; color: var(--muted);">${escapeHtml(
            destinations
          )}</span>
        </label>
      </div>
      <div id="photos-${trip.id}" class="photo-grid-edit" style="display: ${
      trip.isVisible ? "grid" : "none"
    };">
        ${renderTripPhotosEdit(trip.id)}
      </div>
    `;
  });

  html += `
    <button class="btn-save" onclick="saveVisibilityChanges()">Save Changes</button>
  `;

  editContent.innerHTML = html;

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function renderTripPhotosEdit(tripId) {
  const tripPhotos = mockPhotos[tripId] || [];
  if (tripPhotos.length === 0) {
    return '<p style="grid-column: 1/-1; text-align: center; color: var(--muted); font-size: 0.875rem;">No photos in this trip</p>';
  }

  return tripPhotos
    .map(
      (photo) => `
    <div class="photo-item-edit ${photo.isVisible ? "visible" : ""}" 
         onclick="togglePhotoVisibility('${photo.id}', !${photo.isVisible})">
      <img src="${escapeHtml(photo.imageUrl)}" alt="Trip photo" />
      <div class="photo-checkbox"></div>
    </div>
  `
    )
    .join("");
}

function toggleTripVisibility(tripId, isVisible) {
  const photosContainer = document.getElementById(`photos-${tripId}`);
  if (photosContainer) {
    photosContainer.style.display = isVisible ? "grid" : "none";
  }

  // Update mock data
  const trip = mockTrips.find((t) => t.id === tripId);
  if (trip) {
    trip.isVisible = isVisible;
  }
}

function togglePhotoVisibility(photoId, isVisible) {
  // Update mock data
  Object.keys(mockPhotos).forEach((tripId) => {
    const photo = mockPhotos[tripId].find((p) => p.id === photoId);
    if (photo) {
      photo.isVisible = isVisible;
      // Re-render the photo grid
      const photosContainer = document.getElementById(`photos-${tripId}`);
      if (photosContainer) {
        photosContainer.innerHTML = renderTripPhotosEdit(tripId);
      }
    }
  });
}

async function saveVisibilityChanges() {
  try {
    // TODO: Replace with actual API calls
    // for (const trip of mockTrips) {
    //   await fetch(`/api/profile/me/trips/${trip.id}/visibility`, {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ isVisible: trip.isVisible })
    //   });
    // }

    console.log("Saving visibility changes...", mockTrips);
    closeEditMode();
    await loadProfile();
    renderProfile();
  } catch (error) {
    console.error("Error saving visibility changes:", error);
  }
}

function closeEditMode() {
  const editOverlay = document.getElementById("editOverlay");
  if (editOverlay) {
    editOverlay.classList.remove("active");
  }
  isEditMode = false;
}

// ============================================================================
// PHOTO LIGHTBOX
// ============================================================================

function initializePhotoLightbox() {
  const closeLightboxBtn = document.getElementById("closeLightboxBtn");
  const photoLightbox = document.getElementById("photoLightbox");

  if (closeLightboxBtn) {
    closeLightboxBtn.addEventListener("click", closePhotoLightbox);
  }

  if (photoLightbox) {
    photoLightbox.addEventListener("click", (e) => {
      if (e.target === photoLightbox) {
        closePhotoLightbox();
      }
    });
  }
}

function openPhotoLightbox(imageUrl) {
  const photoLightbox = document.getElementById("photoLightbox");
  const lightboxImage = document.getElementById("lightboxImage");

  if (photoLightbox && lightboxImage) {
    lightboxImage.src = imageUrl;
    photoLightbox.classList.add("active");
  }
}

function closePhotoLightbox() {
  const photoLightbox = document.getElementById("photoLightbox");
  if (photoLightbox) {
    photoLightbox.classList.remove("active");
  }
}

// ============================================================================
// SCROLL EFFECTS
// ============================================================================

function initializeScrollEffects() {
  const header = document.getElementById("mainHeader");

  if (header) {
    window.addEventListener(
      "scroll",
      () => {
        if (window.scrollY > 20) {
          header.classList.add("scrolled");
        } else {
          header.classList.remove("scrolled");
        }
      },
      { passive: true }
    );
  }

  // Scroll reveal animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
      }
    });
  }, observerOptions);

  document.querySelectorAll(".scroll-reveal").forEach((el) => {
    observer.observe(el);
  });
}

// Expose functions globally for inline handlers
window.toggleTripVisibility = toggleTripVisibility;
window.togglePhotoVisibility = togglePhotoVisibility;
window.saveVisibilityChanges = saveVisibilityChanges;
