// ============================================================================
// CONSTANTS
// ============================================================================

const apiUrl = ".";

// ============================================================================
// APPLICATION STATE
// ============================================================================

let currentUser = null;
let trips = [];
let flights = [];

// ============================================================================
// MOCK DATA
// ============================================================================

const mockUserData = {
  id: "user-001",
  name: "Avery Tan",
  email: "avery.tan@example.com",
  timezone: "GMT+8",
  avatar: "AT",
  userRole: "user",
  createdAt: "2024-01-15T00:00:00Z",
  updatedAt: "2024-03-15T00:00:00Z",
};

const mockTrips = [
  {
    id: "trip-001",
    tripName: "Tokyo Spring Adventure",
    startDate: "2024-03-20",
    endDate: "2024-03-27",
    currency: "JPY",
    budgetTotal: 250000,
    destinations: [
      { country: "Japan", city: "Tokyo" },
      { country: "Japan", city: "Kyoto" },
    ],
    status: "upcoming",
  },
  {
    id: "trip-002",
    tripName: "European Summer",
    startDate: "2024-06-15",
    endDate: "2024-07-05",
    currency: "EUR",
    budgetTotal: 5000,
    destinations: [
      { country: "France", city: "Paris" },
      { country: "Italy", city: "Rome" },
      { country: "Spain", city: "Barcelona" },
    ],
    status: "upcoming",
  },
  {
    id: "trip-003",
    tripName: "Bali Retreat",
    startDate: "2024-02-10",
    endDate: "2024-02-17",
    currency: "USD",
    budgetTotal: 1200,
    destinations: [{ country: "Indonesia", city: "Bali" }],
    status: "completed",
  },
];

const demoFlights = [
  {
    id: "BB-416",
    flightNumber: "BA 416",
    airline: "British Airways",
    airlineCode: "BA",
    originCity: "San Francisco",
    originAirport: "SFO",
    originAirportFull: "San Francisco International Airport",
    destinationCity: "New York",
    destinationAirport: "JFK",
    destinationAirportFull: "John F. Kennedy International Airport",
    departureTime: "11:30 AM",
    scheduledDeparture: "11:30 AM",
    actualDeparture: "11:40 AM",
    arrivalTime: "08:20 PM",
    scheduledArrival: "08:20 PM",
    estimatedArrival: "09:50 PM",
    gate: "BB",
    status: "in-flight",
    statusText: "IN FLIGHT",
    statusDetail: "10m Late",
    landingDetail: "1h 30m late",
    departureDelay: 10, // minutes
    arrivalDelay: 90, // minutes
    alert: "Ground Delay - Takeoff slot 1:00PM",
    progress: 75,
    bookingNumber: "BA-7K8M2N",
    confirmationCode: "7K8M2N",
    ticketNumber: "125-1234567890",
    aircraft: {
      type: "Boeing 777-300ER",
      age: "8.2 years",
      registration: "G-STBH",
    },
    seat: {
      number: "12A",
      class: "Business",
      amenities: [
        "Lie-flat seat",
        "Priority boarding",
        "Premium dining",
        "Wi-Fi included",
      ],
    },
    seatMap: {
      rows: 42,
      configuration: "3-4-3",
      classBreakdown: {
        first: { rows: "1-4", seats: 14 },
        business: { rows: "5-12", seats: 48 },
        premium: { rows: "13-18", seats: 40 },
        economy: { rows: "19-42", seats: 216 },
      },
    },
  },
  {
    id: "UA-230",
    flightNumber: "UA 230",
    airline: "United Airlines",
    airlineCode: "UA",
    originCity: "New York",
    originAirport: "JFK",
    originAirportFull: "John F. Kennedy International Airport",
    destinationCity: "Los Angeles",
    destinationAirport: "LAX",
    destinationAirportFull: "Los Angeles International Airport",
    departureTime: "06:45 PM",
    scheduledDeparture: "06:45 PM",
    actualDeparture: "06:45 PM",
    arrivalTime: "10:15 PM",
    scheduledArrival: "10:15 PM",
    estimatedArrival: "10:15 PM",
    gate: "C12",
    status: "boarding",
    statusText: "BOARDING",
    statusDetail: "On Time",
    departureDetail: "Boarding in 15m",
    departureDelay: 0,
    arrivalDelay: 0,
    alert: "Gate Changed - Now at C12",
    progress: 0,
    bookingNumber: "UA-X9K4L7",
    confirmationCode: "X9K4L7",
    ticketNumber: "016-9876543210",
    aircraft: {
      type: "Boeing 737-900",
      age: "5.1 years",
      registration: "N37293",
    },
    seat: {
      number: "24F",
      class: "Economy",
      amenities: [
        "Standard seat",
        "Entertainment system",
        "Complimentary snacks",
      ],
    },
    seatMap: {
      rows: 36,
      configuration: "3-3",
      classBreakdown: {
        first: { rows: "1-3", seats: 12 },
        economy: { rows: "4-36", seats: 168 },
      },
    },
  },
  {
    id: "SQ-12",
    flightNumber: "SQ 12",
    airline: "Singapore Airlines",
    airlineCode: "SQ",
    originCity: "Singapore",
    originAirport: "SIN",
    originAirportFull: "Singapore Changi Airport",
    destinationCity: "Tokyo",
    destinationAirport: "NRT",
    destinationAirportFull: "Narita International Airport",
    departureTime: "02:15 AM",
    scheduledDeparture: "02:15 AM",
    actualDeparture: "02:15 AM",
    arrivalTime: "09:30 AM",
    scheduledArrival: "09:30 AM",
    estimatedArrival: "09:30 AM",
    gate: "A5",
    status: "scheduled",
    statusText: "SCHEDULED",
    statusDetail: "On Time",
    departureDelay: 0,
    arrivalDelay: 0,
    progress: 0,
    bookingNumber: "SQ-M5P8Q2",
    confirmationCode: "M5P8Q2",
    ticketNumber: "618-4567890123",
    aircraft: {
      type: "Airbus A350-900",
      age: "3.5 years",
      registration: "9V-SMH",
    },
    seat: {
      number: "15K",
      class: "Premium Economy",
      amenities: [
        "Extra legroom",
        "Wider seat",
        "Premium meals",
        "Priority check-in",
      ],
    },
    seatMap: {
      rows: 40,
      configuration: "3-3-3",
      classBreakdown: {
        suites: { rows: "1-4", seats: 6 },
        business: { rows: "5-12", seats: 40 },
        premium: { rows: "13-18", seats: 36 },
        economy: { rows: "19-40", seats: 198 },
      },
    },
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper function to get airline logo URL
 * Uses multiple fallback services for reliability
 */
function getAirlineLogo(airlineCode) {
  if (!airlineCode) {
    return `https://ui-avatars.com/api/?name=XX&size=64&background=f0f0f0&color=666&bold=true`;
  }

  const code = airlineCode.substring(0, 2).toUpperCase();

  // Map airline codes to Simple Icons slugs (more reliable than clearbit)
  const airlineIcons = {
    // Premium Airlines
    BA: "britishairways",
    EK: "emirates",
    SQ: "singaporeairlines",
    QR: "qatarairways",
    EY: "etihadairways",
    CX: "cathaypacific",
    JL: "japanairlines",
    QF: "qantas",
    VS: "virginatlantic",
    LX: "swiss",
    OS: "austrianairlines",
    TG: "thaiairways",
    KE: "koreanair",
    NH: "allnipponairways",
    
    // Mid-tier Airlines
    UA: "unitedairlines",
    AA: "americanairlines",
    DL: "delta",
    LH: "lufthansa",
    AF: "airfrance",
    KL: "klm",
    IB: "iberia",
    TP: "tapairportugal",
    AC: "aircanada",
    NZ: "airnewzealand",
    BR: "evaair",
    CI: "chinaairlines",
    CA: "airchina",
    MU: "chinaeasternairlines",
    CZ: "chinasouthernairlines",
    TK: "turkishairlines",
    SV: "saudia",
    MS: "egyptair",
    ET: "ethiopianairlines",
    SA: "southafricanairways",
    KU: "kuwaitairways",
    MH: "malaysiaairlines",
    GA: "garudaindonesia",
    PR: "philippineairlines",
    VN: "vietnamairlines",
    AI: "airindia",
    OZ: "asianaairlines",
    WS: "westjet",
    VA: "virginaustralia",
    FJ: "fijiairways",
    PG: "bangkokairways",
    SN: "brusselsairlines",
    
    // Budget Airlines
    TR: "scoot",
    WN: "southwestairlines",
    B6: "jetblue",
    NK: "spiritairlines",
    F9: "frontierairlines",
    AS: "alaskaairlines",
    HA: "hawaiianairlines",
    FR: "ryanair",
    U2: "easyjet",
    VY: "vueling",
    EW: "eurowings",
    DY: "norwegian",
    AK: "airasia",
    D7: "airasia",
    JQ: "jetstar",
    SG: "spicejet",
    G8: "goindigo",
    IX: "airindiaexpress",
    VJ: "vietjetair",
    XW: "scoot",
    TW: "twayair",
    ZE: "eastarjet",
    LJ: "jinair",
    SL: "thaismileair",
  };

  const iconSlug = airlineIcons[code];
  if (iconSlug) {
    // Use Simple Icons CDN (more reliable than clearbit)
    // Format: https://cdn.simpleicons.org/{icon-slug}/{color}
    return `https://cdn.simpleicons.org/${iconSlug}/000000`;
  }

  // Fallback: Try clearbit with domain mapping
  const airlineDomains = {
    BA: "britishairways.com",
    EK: "emirates.com",
    SQ: "singaporeair.com",
    QR: "qatarairways.com",
    EY: "etihad.com",
    CX: "cathaypacific.com",
    JL: "jal.com",
    QF: "qantas.com",
    VS: "virgin-atlantic.com",
    LX: "swiss.com",
    OS: "austrian.com",
    TG: "thaiairways.com",
    KE: "koreanair.com",
    NH: "ana.co.jp",
    UA: "united.com",
    AA: "aa.com",
    DL: "delta.com",
    LH: "lufthansa.com",
    AF: "airfrance.com",
    KL: "klm.com",
    IB: "iberia.com",
    TP: "tap.pt",
    AC: "aircanada.com",
    NZ: "airnewzealand.com",
    BR: "evaair.com",
    CI: "china-airlines.com",
    CA: "airchina.com",
    MU: "ceair.com",
    CZ: "csair.com",
    TK: "turkishairlines.com",
    SV: "saudia.com",
    MS: "egyptair.com",
    ET: "ethiopianairlines.com",
    SA: "flysaa.com",
    KU: "kuwaitairways.com",
    MH: "malaysiaairlines.com",
    GA: "garuda-indonesia.com",
    PR: "philippineairlines.com",
    VN: "vietnamairlines.com",
    AI: "airindia.com",
    OZ: "flyasiana.com",
    WS: "westjet.com",
    VA: "virginaustralia.com",
    FJ: "fijiairways.com",
    PG: "bangkokair.com",
    SN: "brusselsairlines.com",
    TR: "flyscoot.com",
    WN: "southwest.com",
    B6: "jetblue.com",
    NK: "spirit.com",
    F9: "flyfrontier.com",
    AS: "alaskaair.com",
    HA: "hawaiianairlines.com",
    FR: "ryanair.com",
    U2: "easyjet.com",
    VY: "vueling.com",
    EW: "eurowings.com",
    DY: "norwegian.com",
    AK: "airasia.com",
    D7: "airasia.com",
    JQ: "jetstar.com",
    SG: "spicejet.com",
    G8: "goindigo.in",
    IX: "airindiaexpress.in",
    VJ: "vietjetair.com",
    XW: "scoot.com",
    TW: "twayair.com",
    ZE: "eastarjet.com",
    LJ: "jinair.com",
    SL: "thaismileair.com",
  };

  const domain = airlineDomains[code];
  if (domain) {
    // Fallback to clearbit
    return `https://logo.clearbit.com/${domain}`;
  }

  // Final fallback to avatar generator
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(code)}&size=64&background=f0f0f0&color=666&bold=true`;
}

function getFlightStatusColor(status) {
  const statusColors = {
    "on-time": "text-green-600",
    delayed: "text-orange-600",
    "in-flight": "text-blue-600",
    boarding: "text-purple-600",
    scheduled: "text-gray-600",
    cancelled: "text-red-600",
  };
  return statusColors[status.toLowerCase()] || statusColors.scheduled;
}

/**
 * Gets delay color based on delay minutes
 * @param {number} delayMinutes - Delay in minutes
 * @returns {string} CSS class for delay color
 */
function getDelayColor(delayMinutes) {
  if (!delayMinutes || delayMinutes === 0) {
    return "#059669"; // On time - emerald
  } else if (delayMinutes <= 15) {
    return "#d97706"; // Minor delay - amber
  } else if (delayMinutes <= 60) {
    return "#ea580c"; // Moderate delay - orange
  } else {
    return "#dc2626"; // Significant delay - red
  }
}

/**
 * Gets delay indicator text
 * @param {number} delayMinutes - Delay in minutes
 * @returns {string} Delay text
 */
function getDelayText(delayMinutes) {
  if (!delayMinutes || delayMinutes === 0) {
    return "On Time";
  } else if (delayMinutes < 60) {
    return `${delayMinutes}m Late`;
  } else {
    const hours = Math.floor(delayMinutes / 60);
    const minutes = delayMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m late` : `${hours}h late`;
  }
}

function getFlightStatusIcon(status) {
  const statusIcons = {
    "on-time": "check-circle",
    delayed: "clock",
    "in-flight": "plane",
    boarding: "users",
    scheduled: "calendar",
    cancelled: "x-circle",
  };
  return statusIcons[status.toLowerCase()] || statusIcons.scheduled;
}

/**
 * Formats a date object to a readable string
 */
function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a date object to a time string
 */
function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toUpperCase()
    .replace("AM", "AM")
    .replace("PM", "PM");
}

/**
 * Formats time for display - handles both Date objects and time strings
 */
function formatTimeForDisplay(time) {
  if (!time) return "";
  // If it's already a formatted string (from mock data), return as is
  if (
    typeof time === "string" &&
    (time.includes("AM") || time.includes("PM"))
  ) {
    return time;
  }
  // Otherwise, format as Date
  try {
    const d = time instanceof Date ? time : new Date(time);
    if (isNaN(d.getTime())) return time; // If invalid date, return original
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return time; // Return original if parsing fails
  }
}

/**
 * Formats time for display in a specific timezone
 * @param {Date|string} time - The time to format
 * @param {string} timezone - IANA timezone string (e.g., "America/Los_Angeles", "Asia/Singapore")
 * @returns {string} Formatted time string in the specified timezone
 */
function formatTimeInTimezone(time, timezone) {
  if (!time) return "";

  // If it's already a formatted string (from mock data), return as is
  if (
    typeof time === "string" &&
    (time.includes("AM") || time.includes("PM"))
  ) {
    return time;
  }

  // If no timezone provided, fall back to local display
  if (!timezone) {
    return formatTimeForDisplay(time);
  }

  try {
    const d = time instanceof Date ? time : new Date(time);
    if (isNaN(d.getTime())) return time; // If invalid date, return original

    // Format the time in the specified timezone
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });
  } catch (e) {
    console.warn(`Failed to format time in timezone ${timezone}:`, e);
    return formatTimeForDisplay(time); // Fall back to local time if timezone fails
  }
}

/**
 * Escapes HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Animates a number from start to target value
 */
function animateNumber(element, target, start = 0, isCurrency = false) {
  if (!element) return;

  const duration = 1000;
  const startTime = performance.now();
  const startValue = start;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(startValue + (target - startValue) * easeOut);

    if (isCurrency) {
      element.textContent = `$${current.toLocaleString()}`;
    } else {
      element.textContent = current;
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (isCurrency) {
        element.textContent = `$${target.toLocaleString()}`;
      } else {
        element.textContent = target;
      }
    }
  }

  requestAnimationFrame(update);
}

// ============================================================================
// AUTHENTICATION SERVICE - Following Single Responsibility Principle
// ============================================================================

/**
 * AuthService - Handles all authentication-related operations
 * Follows SRP: Only responsible for authentication operations
 */
const AuthService = {
  /**
   * Clears all authentication data from client-side storage
   * @private
   */
  _clearAuthData() {
    // Clear tokens
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");

    // Clear user data
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
  },

  /**
   * Logs out the current user
   * - Calls server logout endpoint to clear HTTP-only cookie
   * - Clears client-side storage
   * - Redirects to auth page
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      // Call server logout endpoint to clear HTTP-only cookie
      const response = await fetch("/auth/logout", {
        method: "POST",
        credentials: "include", // Important: Include cookies in request
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Always clear client-side data regardless of server response
      this._clearAuthData();

      // Check response status
      if (!response.ok) {
        console.warn(
          "Logout endpoint returned non-OK status:",
          response.status
        );
      }

      // Redirect to auth page
      window.location.href = "/auth";
    } catch (error) {
      // On error, still clear client-side data and redirect
      console.error("Logout error:", error);
      this._clearAuthData();
      window.location.href = "/auth";
    }
  },

  /**
   * Gets the current user from storage
   * @returns {Object|null} User object or null if not found
   */
  getCurrentUser() {
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
        return null;
      }
    }
    return null;
  },

  /**
   * Gets the current token from storage
   * @returns {string|null} Token or null if not found
   */
  getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  },
};

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

/**
 * Initializes user profile with real user data from storage or API
 */
async function initializeUserProfile() {
  // Try to get user from storage first
  let user = AuthService.getCurrentUser();

  // If no user in storage, fetch from API
  if (!user) {
    try {
      const token = AuthService.getToken();

      // Build headers - include token if available, otherwise rely on cookies
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/user/settings", {
        headers,
        credentials: "include", // Always include cookies for OAuth users
      });

      if (response.ok) {
        user = await response.json();
        // Store user in sessionStorage for future use
        sessionStorage.setItem("user", JSON.stringify(user));
      } else if (response.status === 401) {
        // Unauthorized - redirect to auth
        console.warn("Unauthorized, redirecting to auth page");
        window.location.href = "/auth";
        return;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Don't throw - use mock data as fallback
    }
  }

  currentUser = user || mockUserData;

  const userName = document.getElementById("userName");
  const heroUserName = document.getElementById("heroUserName");
  const userTimezone = document.getElementById("userTimezone");
  const userAvatar = document.getElementById("userAvatar");

  if (userName && currentUser.name) {
    userName.textContent = currentUser.name;
  }

  if (heroUserName && currentUser.name) {
    heroUserName.textContent = currentUser.name;
  }

  if (userTimezone) {
    // Get user's timezone from settings or use browser timezone
    let timezoneDisplay = currentUser.timezone || "";

    // Convert IANA timezone format (e.g., "Asia/Singapore") to GMT format
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
    }

    if (timezoneDisplay) {
      userTimezone.textContent = timezoneDisplay;
    } else {
      // Use browser's timezone as fallback
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = new Date().getTimezoneOffset();
      const hours = Math.floor(Math.abs(offset) / 60);
      const sign = offset > 0 ? "-" : "+";
      userTimezone.textContent = `GMT${sign}${hours}`;
    }
  }

  if (userAvatar) {
    // Ensure avatar is square (not circular)
    userAvatar.style.borderRadius = "0";

    // Use profile picture if available (for OAuth users)
    if (currentUser.profilePictureUrl) {
      userAvatar.innerHTML = `<img src="${
        currentUser.profilePictureUrl
      }" alt="${
        currentUser.name
      }" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0;" onerror="this.style.display='none'; this.parentElement.textContent='${getInitials(
        currentUser.name
      )}';" />`;
    } else if (currentUser.name) {
      // Create initials from user name
      userAvatar.textContent = getInitials(currentUser.name);
    }
  }

  // Conditionally show admin dropdown item based on user role
  // Security: Only display if userRole === 'admin' (server-side middleware provides ultimate security)
  updateAdminDropdownVisibility();
}

/**
 * Updates admin dropdown item visibility based on user role
 * Follows SOLID principles: Single Responsibility - only handles UI visibility
 * Security Note: This is UI-only - server-side requireAdmin middleware provides actual security
 */
function updateAdminDropdownVisibility() {
  const adminDropdownItem = document.getElementById("adminDropdownItem");
  if (!adminDropdownItem) return;

  // Check if current user has admin role
  // Security: This is only for UI display - server-side verification is required for actual access
  if (currentUser && currentUser.userRole === "admin") {
    adminDropdownItem.classList.remove("hidden");
  } else {
    adminDropdownItem.classList.add("hidden");
  }
}

/**
 * Gets user initials from name
 * @param {string} name - User's full name
 * @returns {string} Initials (e.g., "John Doe" -> "JD")
 */
function getInitials(name) {
  if (!name) return "";
  const nameParts = name.trim().split(" ");
  let initials = "";
  if (nameParts.length >= 2) {
    initials = nameParts[0][0] + nameParts[nameParts.length - 1][0];
  } else if (nameParts.length === 1) {
    initials = nameParts[0].substring(0, 2);
  }
  return initials.toUpperCase();
}

/**
 * Loads trips from API for the authenticated user
 * Follows Single Responsibility Principle: Only responsible for fetching and storing user's trips
 */
async function loadTrips() {
  try {
    let tripsData = [];

    try {
      const response = await fetch(`${apiUrl}/trip`, {
        method: "GET",
        credentials: "include", // Include cookies for authentication
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        tripsData = await response.json();
      } else if (response.status === 401) {
        // User not authenticated - redirect to auth
        console.warn("User not authenticated, redirecting to auth page");
        window.location.href = "/auth";
        return;
      } else {
        console.warn("Failed to load trips, using empty array");
        tripsData = [];
      }
    } catch (error) {
      console.error("Error loading trips:", error);
      tripsData = [];
    }

    trips = tripsData;
    renderTrips(tripsData);
    updateTripStats(tripsData);
  } catch (error) {
    console.error("Error loading trips:", error);
    trips = [];
    renderTrips([]);
    updateTripStats([]);
  }
}

/**
 * Loads flights from API or uses mock data
 */
async function loadFlights() {
  try {
    const response = await fetch("/api/flights", {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      flights = data.flights || [];
      console.log("Loaded flights from API:", flights);
      // Log first flight for debugging
      if (flights.length > 0) {
        console.log("First flight details:", {
          airline: flights[0].airline,
          airlineCode: flights[0].airlineCode,
          flightNumber: flights[0].flightNumber,
          scheduledDeparture: flights[0].scheduledDeparture,
          actualDeparture: flights[0].actualDeparture,
          departureDelay: flights[0].departureDelay,
        });
      }
      renderFlightCards();

      // Refresh flight statuses after initial load
      await refreshFlightStatuses();
    } else {
      // API request failed - don't fallback to demo data, show empty state
      console.warn("Failed to load flights from API");
      flights = [];
      renderFlightCards();
    }
  } catch (error) {
    console.error("Error loading flights:", error);
    // On error, show empty state instead of demo data
    flights = [];
    renderFlightCards();
  }
}

/**
 * Refreshes flight statuses from API for all active flights
 */
async function refreshFlightStatuses() {
  if (!flights || flights.length === 0) {
    console.log("[Flight Refresh] No flights to refresh");
    return;
  }

  console.log(
    `[Flight Refresh] Checking ${flights.length} flights for updates...`
  );

  // Refresh each flight that needs updating
  const refreshPromises = flights.map(async (flight) => {
    // Only refresh flights that have an API flight ID or can be searched
    if (!flight.apiFlightId && !(flight.airlineCode && flight.flightNumber)) {
      console.log(
        `[Flight Refresh] Skipping ${flight.airlineCode || "Unknown"}${
          flight.flightNumber || ""
        } - no API ID and no flight number`
      );
      return flight;
    }

    // Check if flight needs update
    const shouldUpdate = shouldFlightBeUpdated(flight);
    if (!shouldUpdate) {
      return flight;
    }

    try {
      console.log(
        `[Flight Refresh] Updating ${flight.airlineCode}${flight.flightNumber}...`
      );
      const response = await fetch(`/api/flights/${flight.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({}), // Empty body - server will fetch from API
      });

      if (response.ok) {
        const data = await response.json();
        console.log(
          `[Flight Refresh] ✓ Updated ${flight.airlineCode}${flight.flightNumber}: ${flight.status} → ${data.flight.status}`
        );
        return data.flight;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(
          `[Flight Refresh] ✗ Failed to update ${flight.airlineCode}${
            flight.flightNumber
          }: ${errorData.error || response.status}`
        );
        return flight;
      }
    } catch (error) {
      console.error(
        `[Flight Refresh] ✗ Error updating ${flight.airlineCode}${flight.flightNumber}:`,
        error.message
      );
      return flight;
    }
  });

  const updatedFlights = await Promise.all(refreshPromises);

  // Update local flights array
  flights = updatedFlights;

  // Re-render flight cards with updated data
  renderFlightCards();

  console.log(`[Flight Refresh] Refresh complete`);
}

/**
 * Determines if a flight should be updated based on its current state
 */
function shouldFlightBeUpdated(flight) {
  // Don't update if flight has already landed and we have actual arrival time
  if (flight.status === "landed" && flight.actualArrival) {
    console.log(
      `[shouldFlightBeUpdated] ${flight.airlineCode}${flight.flightNumber}: Skipping - already landed with actual arrival`
    );
    return false;
  }

  // Don't update if flight was cancelled
  if (flight.status === "cancelled") {
    console.log(
      `[shouldFlightBeUpdated] ${flight.airlineCode}${flight.flightNumber}: Skipping - cancelled`
    );
    return false;
  }

  // IMPORTANT: Check active states FIRST, even if flight is old
  // This ensures flights stuck in "in_flight" status get updated to "landed"
  const activeStatuses = ["scheduled", "boarding", "in_flight", "delayed"];
  if (activeStatuses.includes(flight.status)) {
    // Always update flights in active states, regardless of age
    // This fixes the issue where flights that landed months ago are still marked as "in_flight"
    console.log(
      `[shouldFlightBeUpdated] ${flight.airlineCode}${flight.flightNumber}: Updating - status is "${flight.status}" (active state, updating regardless of age)`
    );
    return true;
  }

  // Check if flight is stale (more than 48 hours past scheduled arrival)
  // Only check this for flights NOT in active states
  if (flight.scheduledArrival) {
    const scheduledArrival = new Date(flight.scheduledArrival);
    const now = new Date();
    const hoursSinceScheduledArrival =
      (now - scheduledArrival) / (1000 * 60 * 60);

    // If flight is very old (more than 48 hours), skip
    if (hoursSinceScheduledArrival > 48) {
      console.log(
        `[shouldFlightBeUpdated] ${flight.airlineCode}${
          flight.flightNumber
        }: Skipping - ${hoursSinceScheduledArrival.toFixed(
          1
        )} hours past arrival and not in active state`
      );
      return false;
    }
  }

  // Update if flight is within 4 hours of scheduled departure or arrival
  const now = new Date();
  if (flight.scheduledDeparture) {
    const scheduledDeparture = new Date(flight.scheduledDeparture);
    const hoursUntilDeparture = (scheduledDeparture - now) / (1000 * 60 * 60);
    if (hoursUntilDeparture >= -4 && hoursUntilDeparture <= 4) {
      console.log(
        `[shouldFlightBeUpdated] ${flight.airlineCode}${flight.flightNumber}: Updating - within 4 hours of departure`
      );
      return true;
    }
  }

  console.log(
    `[shouldFlightBeUpdated] ${flight.airlineCode}${flight.flightNumber}: Skipping - no update criteria met`
  );
  return false;
}

/**
 * Updates trip statistics display with user's actual data
 * Follows Single Responsibility Principle: Only responsible for calculating and displaying stats
 * @param {Array} tripsData - Array of trip objects for the current user
 */
function updateTripStats(tripsData) {
  if (!tripsData || !Array.isArray(tripsData)) {
    tripsData = [];
  }

  // Calculate statistics from user's trips only
  const totalTrips = tripsData.length;

  // Active trips: trips that haven't ended yet
  const now = new Date();
  const activeTrips = tripsData.filter((trip) => {
    const endDate = new Date(trip.endDate);
    return endDate >= now;
  }).length;

  // Total budget: sum of all trip budgets
  const totalBudget = tripsData.reduce(
    (sum, trip) => sum + (trip.budgetTotal || 0),
    0
  );

  // Unique countries: extract from trip destinations
  const countries = new Set(
    tripsData.flatMap((trip) => trip.destinations?.map((d) => d.country) || [])
  ).size;

  // Get DOM elements
  const statTotalTrips = document.getElementById("statTotalTrips");
  const statActiveTrips = document.getElementById("statActiveTrips");
  const statBudget = document.getElementById("statBudget");
  const statCountries = document.getElementById("statCountries");

  // Display actual user statistics (no fallback to mock data)
  const finalTotalTrips = totalTrips;
  const finalActiveTrips = activeTrips;
  const finalBudget = totalBudget;
  const finalCountries = countries;

  // Animate numbers to actual values
  if (statTotalTrips) {
    animateNumber(statTotalTrips, finalTotalTrips, 0);
  }
  if (statActiveTrips) {
    animateNumber(statActiveTrips, finalActiveTrips, 0);
  }
  if (statBudget) {
    animateNumber(statBudget, finalBudget, 0, true);
  }
  if (statCountries) {
    animateNumber(statCountries, finalCountries, 0);
  }
}

// ============================================================================
// UI RENDERING
// ============================================================================

/**
 * Renders trip cards to the DOM
 */
function renderTrips(tripsData) {
  const tripsList = document.getElementById("activeTripsList");
  if (!tripsList) return;

  tripsList.innerHTML = "";

  if (tripsData.length === 0) {
    tripsList.innerHTML = `
      <div class="trip-card border border-dashed border-border bg-sheet/50 p-8 text-center col-span-full">
        <i data-lucide="map" class="mx-auto mb-3 h-8 w-8 text-muted"></i>
        <p class="text-sm text-muted">
          No active trips. Start planning your next adventure.
        </p>
        <button
          id="startPlanningBtn"
          class="mt-4 text-xs uppercase tracking-wider text-ink underline hover:no-underline"
        >
          Create First Trip
        </button>
      </div>
    `;
    if (window.lucide?.createIcons) window.lucide.createIcons();
    return;
  }

  tripsData.forEach((trip) => {
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const tripCard = document.createElement("article");
    tripCard.className =
      "trip-card group cursor-pointer border border-border bg-sheet transition-all duration-500 hover:border-navy hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden";
    tripCard.innerHTML = `
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 mb-5">
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold tracking-tight text-ink mb-1.5 truncate">${escapeHtml(
              trip.tripName
            )}</h3>
            <div class="flex items-center gap-2 text-xs text-muted">
              <i data-lucide="calendar" class="h-3 w-3 flex-shrink-0"></i>
              <p class="truncate">
                ${formatDate(startDate)} - ${formatDate(endDate)}
              </p>
            </div>
          </div>
          <div class="flex-shrink-0 flex h-10 w-10 items-center justify-center border border-border bg-canvas transition-all duration-300 group-hover:border-navy group-hover:bg-navy">
            <i data-lucide="map" class="h-4 w-4 text-ink group-hover:text-sheet transition-colors duration-300"></i>
          </div>
        </div>

        <!-- Stats Grid with Icons -->
        <div class="grid grid-cols-2 gap-5 py-5 border-y border-border">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <i data-lucide="clock" class="h-3.5 w-3.5 text-muted flex-shrink-0"></i>
              <p class="text-xs uppercase tracking-wide text-muted font-semibold">Duration</p>
            </div>
            <p class="text-sm font-semibold text-ink">${days} day${
      days > 1 ? "s" : ""
    }</p>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-2">
              <i data-lucide="banknote" class="h-3.5 w-3.5 text-muted flex-shrink-0"></i>
              <p class="text-xs uppercase tracking-wide text-muted font-semibold">Budget</p>
            </div>
            <p class="text-sm font-semibold text-ink">${
              trip.currency || "SGD"
            } ${(trip.budgetTotal || 0).toLocaleString()}</p>
          </div>
        </div>

        <!-- View Details Link -->
        <div class="flex items-center justify-between pt-5">
          <span class="text-xs uppercase tracking-widest text-muted group-hover:text-navy transition-colors duration-300 font-semibold">View Details</span>
          <i data-lucide="arrow-right" class="h-4 w-4 text-muted group-hover:text-navy group-hover:translate-x-1 transition-all duration-300"></i>
        </div>
      </div>
    `;
    tripCard.addEventListener("click", () => viewTrip(trip.id));
    tripsList.appendChild(tripCard);
  });

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/**
 * Renders flight cards to the DOM with exquisite Swiss/Swedish design
 */
function renderFlightCards() {
  const activeFlightsList = document.getElementById("activeFlightsList");
  if (!activeFlightsList) return;

  activeFlightsList.innerHTML = "";

  if (flights.length === 0) {
    activeFlightsList.innerHTML = `
      <div class="border border-dashed border-border bg-sheet/50 p-8 text-center">
        <i data-lucide="plane" class="mx-auto mb-3 h-8 w-8 text-muted"></i>
        <p class="text-sm text-muted">
          No active flights. Add your flight number to start tracking.
        </p>
        <button
          id="startTrackingBtn"
          class="mt-4 text-xs uppercase tracking-wider text-ink underline hover:no-underline"
          onclick="openFlightSearchModal()"
        >
          Start Tracking
        </button>
      </div>
    `;
    if (window.lucide?.createIcons) window.lucide.createIcons();
    return;
  }

  flights.forEach((flight, index) => {
    const flightCard = document.createElement("article");
    flightCard.className = "flight-card border border-border bg-sheet";
    flightCard.style.opacity = "0";
    flightCard.style.transform = "translateY(24px) scale(0.98)";

    // Status configuration with refined colors
    const statusConfig = {
      "in-flight": {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: "plane",
      },
      in_flight: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: "plane",
      },
      boarding: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: "users",
      },
      scheduled: {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
        icon: "calendar",
      },
      landed: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        icon: "check-circle",
      },
      cancelled: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "x-circle",
      },
      delayed: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: "clock",
      },
    };

    const statusStyle = statusConfig[flight.status] || statusConfig.scheduled;

    // Delay color coding
    const departureDelayColor = getDelayColor(flight.departureDelay || 0);
    const arrivalDelayColor = getDelayColor(flight.arrivalDelay || 0);
    const departureDelayText = getDelayText(flight.departureDelay || 0);
    const arrivalDelayText = getDelayText(flight.arrivalDelay || 0);

    // Debug logging for delays
    if (flight.departureDelay > 0 || flight.arrivalDelay > 0) {
      console.log(
        `Flight ${flight.airlineCode}${flight.flightNumber} delay info:`,
        {
          departureDelay: flight.departureDelay,
          arrivalDelay: flight.arrivalDelay,
          scheduledDeparture: flight.scheduledDeparture,
          actualDeparture: flight.actualDeparture,
          scheduledArrival: flight.scheduledArrival,
          estimatedArrival: flight.estimatedArrival,
          actualArrival: flight.actualArrival,
          departureDelayText,
          arrivalDelayText,
          willShowDepartureDelay: !!(
            flight.actualDeparture &&
            flight.departureDelay &&
            flight.departureDelay > 0
          ),
          willShowArrivalDelay: !!(
            (flight.estimatedArrival || flight.actualArrival) &&
            flight.arrivalDelay &&
            flight.arrivalDelay > 0
          ),
        }
      );
    }

    flightCard.innerHTML = `
      <div class="relative" style="padding: 2rem;">
        <!-- Status Badge - Top Right with animation -->
        <div class="flight-status-badge flex items-center gap-2 px-3 py-1.5 rounded-sm" data-status="${
          flight.status
        }" style="padding: 0.375rem 0.75rem; gap: 0.5rem;">
          <i data-lucide="${
            statusStyle.icon
          }" class="h-3.5 w-3.5" style="width: 0.875rem; height: 0.875rem;"></i>
          <span class="text-[0.6875rem] font-semibold uppercase tracking-[0.15em]" style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">${escapeHtml(
            flight.statusText || flight.status.toUpperCase()
          )}</span>
        </div>

        <!-- Airline Info Section -->
        <div class="mb-10 flex items-start gap-4" style="margin-bottom: 2.5rem;">
          <div class="flex-shrink-0" style="width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border: 1px solid #dcd6c8; background: #fefdf9; padding: 8px;">
            <img
              src="${getAirlineLogo(flight.airlineCode || "")}"
              alt="${escapeHtml(flight.airline)}"
              class="max-w-full max-h-full object-contain"
              style="width: 100%; height: 100%; display: block;"
              loading="eager"
              data-airline-code="${escapeHtml((flight.airlineCode || "XX").substring(0, 2).toUpperCase())}"
              data-fallback-attempt="0"
              onerror="(function(img) {
                const code = img.dataset.airlineCode || 'XX';
                let attempt = parseInt(img.dataset.fallbackAttempt || '0');
                attempt++;
                img.dataset.fallbackAttempt = attempt;
                const airlineDomains = {BA:'britishairways.com',EK:'emirates.com',SQ:'singaporeair.com',QR:'qatarairways.com',EY:'etihad.com',CX:'cathaypacific.com',JL:'jal.com',QF:'qantas.com',VS:'virgin-atlantic.com',LX:'swiss.com',OS:'austrian.com',TG:'thaiairways.com',KE:'koreanair.com',NH:'ana.co.jp',UA:'united.com',AA:'aa.com',DL:'delta.com',LH:'lufthansa.com',AF:'airfrance.com',KL:'klm.com',IB:'iberia.com',TP:'tap.pt',AC:'aircanada.com',NZ:'airnewzealand.com',BR:'evaair.com',CI:'china-airlines.com',CA:'airchina.com',MU:'ceair.com',CZ:'csair.com',TK:'turkishairlines.com',SV:'saudia.com',MS:'egyptair.com',ET:'ethiopianairlines.com',SA:'flysaa.com',KU:'kuwaitairways.com',MH:'malaysiaairlines.com',GA:'garuda-indonesia.com',PR:'philippineairlines.com',VN:'vietnamairlines.com',AI:'airindia.com',OZ:'flyasiana.com',WS:'westjet.com',VA:'virginaustralia.com',FJ:'fijiairways.com',PG:'bangkokair.com',SN:'brusselsairlines.com',TR:'flyscoot.com',WN:'southwest.com',B6:'jetblue.com',NK:'spirit.com',F9:'flyfrontier.com',AS:'alaskaair.com',HA:'hawaiianairlines.com',FR:'ryanair.com',U2:'easyjet.com',VY:'vueling.com',EW:'eurowings.com',DY:'norwegian.com',AK:'airasia.com',D7:'airasia.com',JQ:'jetstar.com',SG:'spicejet.com',G8:'goindigo.in',IX:'airindiaexpress.in',VJ:'vietjetair.com',XW:'scoot.com',TW:'twayair.com',ZE:'eastarjet.com',LJ:'jinair.com',SL:'thaismileair.com'};
                if (attempt === 1 && airlineDomains[code]) {
                  img.src = 'https://logo.clearbit.com/' + airlineDomains[code];
                } else {
                  img.onerror = null;
                  img.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(code) + '&size=64&background=f0f0f0&color=666&bold=true';
                }
              })(this)"
            />
          </div>
          <div class="flex-1">
            <p class="text-[0.6875rem] uppercase tracking-[0.2em] text-muted mb-1" style="color: #6d7177; margin-bottom: 0.25rem;">${escapeHtml(
              flight.airline
            )}</p>
            <p class="font-mono text-2xl font-bold tracking-tight" style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">${
              (flight.airlineCode || "") + " " + (flight.flightNumber || "")
            }</p>
          </div>
        </div>

        <!-- Route Section with Progress Bar -->
        <div class="mb-10" style="margin-bottom: 2.5rem;">
          <div class="relative" style="position: relative;">
            <!-- Airport Codes and Progress Bar Row -->
            <div class="flex items-center justify-between relative mb-4" style="position: relative; margin-bottom: 1rem; align-items: center;">
              <!-- Departure Airport Code -->
              <div class="flex-shrink-0" style="flex-shrink: 0; position: relative; z-index: 3; background: var(--sheet);">
                <p class="text-3xl font-bold tracking-tight" style="font-size: 1.875rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">${escapeHtml(
                  flight.originAirport
                )}</p>
            </div>

              <!-- Progress Bar Container - Spans Between Airport Codes -->
              <div class="flex-1 relative mx-6" style="flex: 1 1 auto; margin-left: 1.5rem; margin-right: 2.5rem; height: 24px; position: relative; min-width: 0; z-index: 1; padding: 8px 0;">
                <!-- Background Track -->
                <div class="absolute left-0 right-0 rounded-full" style="background-color: #dcd6c8; top: 50%; margin-top: -2px; height: 4px; width: 100%;"></div>
                <!-- Progress Fill -->
                <div
                  class="flight-progress-bar-${flight.id}"
                  style="width: 0%; top: 50%; margin-top: -2px; left: 0;"
                data-progress="${flight.progress}"
              ></div>
                <!-- Plane Icon - Leading the progress -->
              <div
                  class="flight-plane-icon-${flight.id}"
                  style="left: 0%; top: 50%; transform: translateY(-50%); pointer-events: none;"
                data-progress="${flight.progress}"
              >
                  <i data-lucide="plane" class="h-6 w-6" style="color: #10b981; transform: rotate(45deg); filter: drop-shadow(0 2px 8px rgba(16, 185, 129, 0.6)) drop-shadow(0 0 16px rgba(16, 185, 129, 0.4));"></i>
              </div>
            </div>

              <!-- Arrival Airport Code -->
              <div class="flex-shrink-0" style="flex-shrink: 0; position: relative; z-index: 3; background: var(--sheet);">
                <p class="text-3xl font-bold tracking-tight" style="font-size: 1.875rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">${escapeHtml(
                  flight.destinationAirport
                )}</p>
              </div>
            </div>

            <!-- City and Airport Name Row -->
            <div class="flex items-start justify-between mb-4" style="margin-bottom: 1rem;">
              <!-- Departure Details -->
              <div class="flex-1" style="flex: 1 1 0%; min-width: 0; max-width: calc(50% - 3rem);">
                <p class="text-sm text-muted mb-0.5 leading-relaxed" style="font-size: 0.875rem; color: #6d7177; margin-bottom: 0.125rem; line-height: 1.5;">${escapeHtml(
                  flight.originCity
                )}</p>
                <p class="text-[0.625rem] text-muted leading-tight" style="font-size: 0.625rem; color: #6d7177; opacity: 0.6; line-height: 1.3; margin-bottom: 0.75rem;">${escapeHtml(
                  flight.originAirportFull || `${flight.originCity} Airport`
                )}</p>
              </div>

              <!-- Spacer for progress bar -->
              <div class="flex-1 mx-6" style="flex: 1 1 auto; margin-left: 1.5rem; margin-right: 2.5rem; min-width: 0;"></div>

              <!-- Arrival Details -->
              <div class="flex-1 text-right" style="flex: 1 1 0%; min-width: 0; max-width: calc(50% - 3rem);">
                <p class="text-sm text-muted mb-0.5 leading-relaxed" style="font-size: 0.875rem; color: #6d7177; margin-bottom: 0.125rem; line-height: 1.5;">${escapeHtml(
                  flight.destinationCity
                )}</p>
                <p class="text-[0.625rem] text-muted leading-tight" style="font-size: 0.625rem; color: #6d7177; opacity: 0.6; line-height: 1.3; margin-bottom: 0.75rem;">${escapeHtml(
                  flight.destinationAirportFull ||
                    `${flight.destinationCity} Airport`
                )}</p>
              </div>
            </div>

            <!-- Times Row -->
            <div class="flex items-start justify-between">
              <!-- Departure Time -->
              <div class="flex-1" style="flex: 1 1 0%; min-width: 0; max-width: calc(50% - 3rem);">
                <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-1" style="color: #6d7177; margin-bottom: 0.25rem;">Departure</p>
                ${
                  flight.departureDelay && flight.departureDelay > 0
                    ? `
                    <p class="font-mono text-sm text-muted mb-1" style="font-size: 0.875rem; text-decoration: line-through; opacity: 0.6;">
                      ${formatTimeInTimezone(
                        flight.scheduledDeparture,
                        flight.originTimezone
                      )}
                    </p>
                    <p class="font-mono text-base font-semibold" style="font-size: 1rem; font-weight: 600; color: ${departureDelayColor};">
                      ${formatTimeInTimezone(
                        flight.actualDeparture ||
                          flight.estimatedDeparture ||
                          flight.scheduledDeparture,
                        flight.originTimezone
                      )}
                    </p>
                    <p class="text-xs mt-0.5" style="margin-top: 0.125rem; font-size: 0.75rem; color: ${departureDelayColor};">${departureDelayText}</p>
                    `
                    : `
                    <p class="font-mono text-base font-semibold" style="font-size: 1rem; font-weight: 600; color: ${departureDelayColor};">
                      ${formatTimeInTimezone(
                        flight.scheduledDeparture || flight.departureTime,
                        flight.originTimezone
                      )}
                    </p>
                    `
                }
              </div>

              <!-- Spacer for alignment -->
              <div class="flex-1 mx-6" style="flex: 1 1 auto; margin-left: 1.5rem; margin-right: 1.5rem; min-width: 0;"></div>

              <!-- Arrival Time -->
              <div class="flex-1 text-right" style="flex: 1 1 0%; min-width: 0; max-width: calc(50% - 3rem);">
                <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-1" style="color: #6d7177; margin-bottom: 0.25rem;">Arrival</p>
                ${
                  flight.arrivalDelay && flight.arrivalDelay > 0
                    ? `
                    <p class="font-mono text-sm text-muted mb-1" style="font-size: 0.875rem; text-decoration: line-through; opacity: 0.6;">
                      ${formatTimeInTimezone(
                        flight.scheduledArrival,
                        flight.destinationTimezone
                      )}
                    </p>
                    <p class="font-mono text-base font-semibold" style="font-size: 1rem; font-weight: 600; color: ${arrivalDelayColor};">
                      ${formatTimeInTimezone(
                        flight.actualArrival ||
                          flight.estimatedArrival ||
                          flight.scheduledArrival,
                        flight.destinationTimezone
                      )}
                    </p>
                    <p class="text-xs mt-0.5" style="margin-top: 0.125rem; font-size: 0.75rem; color: ${arrivalDelayColor};">${arrivalDelayText}</p>
                    `
                    : `
                    <p class="font-mono text-base font-semibold" style="font-size: 1rem; font-weight: 600; color: ${arrivalDelayColor};">
                      ${formatTimeInTimezone(
                        flight.scheduledArrival || flight.arrivalTime,
                        flight.destinationTimezone
                      )}
                    </p>
                    `
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Status Details Row - Refined Layout -->
        <div class="flex items-start justify-between gap-8 border-t pt-6" style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #dcd6c8;">
          <div class="flex items-start gap-6 flex-wrap">
            ${
              flight.gate
                ? `
            <div>
              <p class="text-[0.65rem] uppercase tracking-[0.3em] text-muted mb-2" style="color: #6d7177; margin-bottom: 0.5rem;">Dep. Gate</p>
              <p class="text-base font-semibold tracking-tight mb-0.5" style="font-size: 1rem; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 0.125rem;">${escapeHtml(
                flight.gate
              )}</p>
              ${
                flight.terminal
                  ? `<p class="text-xs text-muted" style="font-size: 0.75rem; color: #6d7177; margin-top: 0.125rem;">Terminal ${escapeHtml(
                      flight.terminal
                    )}</p>`
                  : ""
              }
            </div>
            `
                : ""
            }
            ${
              flight.gateArrival
                ? `
            <div>
              <p class="text-[0.65rem] uppercase tracking-[0.3em] text-muted mb-2" style="color: #6d7177; margin-bottom: 0.5rem;">Arr. Gate</p>
              <p class="text-base font-semibold tracking-tight mb-0.5" style="font-size: 1rem; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 0.125rem;">${escapeHtml(
                flight.gateArrival
              )}</p>
              ${
                flight.terminalArrival
                  ? `<p class="text-xs text-muted" style="font-size: 0.75rem; color: #6d7177; margin-top: 0.125rem;">Terminal ${escapeHtml(
                      flight.terminalArrival
                    )}</p>`
                  : ""
              }
            </div>
            `
                : ""
            }
            ${
              flight.baggageClaim
                ? `
            <div>
              <p class="text-[0.65rem] uppercase tracking-[0.3em] text-muted mb-2" style="color: #6d7177; margin-bottom: 0.5rem;">Baggage</p>
              <p class="text-base font-semibold tracking-tight" style="font-size: 1rem; font-weight: 600; letter-spacing: -0.01em;">${escapeHtml(
                flight.baggageClaim
              )}</p>
            </div>
            `
                : ""
            }
            ${
              flight.statusDetail
                ? `
            <div>
              <p class="text-[0.65rem] uppercase tracking-[0.3em] text-muted mb-2" style="color: #6d7177; margin-bottom: 0.5rem;">Status</p>
              <p class="text-base font-semibold" style="font-size: 1rem; font-weight: 600; letter-spacing: -0.01em; color: ${departureDelayColor};">${escapeHtml(
                    flight.statusDetail
                  )}</p>
            </div>
            `
                : ""
            }
            ${
              flight.landingDetail
                ? `
            <div>
              <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-1.5" style="color: #6d7177; margin-bottom: 0.375rem;">Landing</p>
              <p class="text-base font-semibold" style="font-size: 1rem; font-weight: 600; letter-spacing: -0.01em; color: ${arrivalDelayColor};">${escapeHtml(
                    flight.landingDetail
                  )}</p>
            </div>
            `
                : ""
            }
          </div>
          <button
            class="flight-details-btn shrink-0"
            data-flight-id="${flight.id}"
          >
            <span>View Details</span>
          </button>
        </div>

        ${
          flight.alert
            ? `
        <div class="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3" style="margin-top: 1.5rem; padding: 0.875rem 1rem; border: 1px solid #fde68a; background: #fffbeb;">
          <i data-lucide="info" class="h-4 w-4 text-amber-700 shrink-0 mt-0.5" style="width: 1rem; height: 1rem; color: #b45309; flex-shrink: 0; margin-top: 0.125rem;"></i>
          <p class="text-xs leading-relaxed text-amber-900" style="font-size: 0.75rem; line-height: 1.5; color: #78350f;">${escapeHtml(
            flight.alert
          )}</p>
        </div>
        `
            : ""
        }
      </div>
    `;

    activeFlightsList.appendChild(flightCard);

    // Staggered entrance animation with delay based on index
    const animationDelay = index * 80; // 80ms stagger between cards

    setTimeout(() => {
      requestAnimationFrame(() => {
        // Force reflow to ensure initial state is rendered
        void flightCard.offsetHeight;

        requestAnimationFrame(() => {
          flightCard.style.transition =
            "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
          flightCard.style.opacity = "1";
          flightCard.style.transform = "translateY(0) scale(1)";

          // Animate progress bar and plane after card appears
          setTimeout(() => {
            const progressBar = flightCard.querySelector(
              `.flight-progress-bar-${flight.id}`
            );
            const planeIcon = flightCard.querySelector(
              `.flight-plane-icon-${flight.id}`
            );

            if (progressBar && planeIcon) {
              const targetProgress =
                parseFloat(progressBar.dataset.progress) || 0;

              // Force a reflow to ensure styles are applied
              void progressBar.offsetHeight;
              void planeIcon.offsetHeight;

              // Set initial state explicitly
              progressBar.style.width = "0%";
              planeIcon.style.left = "0%";
              planeIcon.style.transform = "translateX(-50%) translateY(-50%)";

              // Animate progress bar with smooth easing
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  progressBar.style.transition =
                    "width 2.5s cubic-bezier(0.16, 1, 0.3, 1)";
                  progressBar.style.width = `${targetProgress}%`;

                  // Animate plane icon - positioned at the end of the progress bar
                  const planePosition =
                    targetProgress > 0 ? Math.min(targetProgress, 100) : 0; // Position at the end of progress bar
                  planeIcon.style.transition =
                    "left 2.5s cubic-bezier(0.16, 1, 0.3, 1)";
                  planeIcon.style.left = `${planePosition}%`;
                });
              });
            }
          }, 400); // Reduced from 600ms for faster animation
        });
      });
    }, animationDelay);
  });

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

// ============================================================================
// FLIGHT DETAILS MODAL
// ============================================================================

function openFlightDetailsModal(flightId) {
  const flight = flights.find((f) => f.id === flightId);
  if (!flight) return;

  const modal = document.getElementById("flightDetailsModal");
  const modalContent = document.getElementById("flightDetailsContent");
  if (!modal || !modalContent) return;

  const statusConfig = {
    "in-flight": {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: "plane",
    },
    in_flight: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: "plane",
    },
    boarding: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: "users",
    },
    scheduled: {
      bg: "bg-slate-50",
      text: "text-slate-700",
      border: "border-slate-200",
      icon: "calendar",
    },
    landed: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      icon: "check-circle",
    },
    cancelled: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: "x-circle",
    },
    delayed: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: "clock",
    },
  };

  const statusStyle = statusConfig[flight.status] || statusConfig.scheduled;
  const departureDelayColor = getDelayColor(flight.departureDelay || 0);
  const arrivalDelayColor = getDelayColor(flight.arrivalDelay || 0);
  const departureDelayText = getDelayText(flight.departureDelay || 0);
  const arrivalDelayText = getDelayText(flight.arrivalDelay || 0);

  // Format dates for display
  const formatDateTime = (dateTime) => {
    if (!dateTime) return "N/A";
    const date = new Date(dateTime);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Calculate flight duration
  const calculateDuration = (departure, arrival) => {
    if (!departure || !arrival) return null;
    const depTime = new Date(departure);
    const arrTime = new Date(arrival);
    const diffMs = arrTime - depTime;
    if (diffMs < 0) return null; // Invalid duration
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Get actual flight duration (prioritize actual times over scheduled)
  const getActualDuration = (flight) => {
    // Use actual times if available
    if (flight.actualDeparture && flight.actualArrival) {
      return calculateDuration(flight.actualDeparture, flight.actualArrival);
    }
    // Use actual departure with estimated arrival
    if (flight.actualDeparture && flight.estimatedArrival) {
      return calculateDuration(flight.actualDeparture, flight.estimatedArrival);
    }
    // Fall back to scheduled times
    return calculateDuration(
      flight.scheduledDeparture,
      flight.scheduledArrival
    );
  };

  // Format relative time (e.g., "2 hours ago", "just now")
  const formatRelativeTime = (dateTime) => {
    if (!dateTime) return null;
    const now = new Date();
    const date = new Date(dateTime);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDateTime(dateTime);
  };

  // Aircraft type decoder - converts ICAO codes to readable names
  const getAircraftModel = (code) => {
    if (!code) return null;
    const aircraftTypes = {
      // Boeing
      B78X: "Boeing 787-10 Dreamliner",
      B789: "Boeing 787-9 Dreamliner",
      B788: "Boeing 787-8 Dreamliner",
      B77W: "Boeing 777-300ER",
      B77L: "Boeing 777-200LR",
      B772: "Boeing 777-200",
      B773: "Boeing 777-300",
      B779: "Boeing 777-9",
      B77X: "Boeing 777X",
      B748: "Boeing 747-8",
      B744: "Boeing 747-400",
      B38M: "Boeing 737 MAX 8",
      B39M: "Boeing 737 MAX 9",
      B37M: "Boeing 737 MAX 7",
      B738: "Boeing 737-800",
      B739: "Boeing 737-900",
      B737: "Boeing 737",
      B752: "Boeing 757-200",
      B753: "Boeing 757-300",
      B762: "Boeing 767-200",
      B763: "Boeing 767-300",
      B764: "Boeing 767-400",

      // Airbus
      A388: "Airbus A380-800",
      A35K: "Airbus A350-1000",
      A359: "Airbus A350-900",
      A339: "Airbus A330-900neo",
      A338: "Airbus A330-800neo",
      A333: "Airbus A330-300",
      A332: "Airbus A330-200",
      A21N: "Airbus A321neo",
      A321: "Airbus A321",
      A20N: "Airbus A320neo",
      A320: "Airbus A320",
      A319: "Airbus A319",
      A318: "Airbus A318",
      A310: "Airbus A310",
      A300: "Airbus A300",

      // Other manufacturers
      B06: "Bell 206",
      E190: "Embraer E190",
      E195: "Embraer E195",
      E75L: "Embraer E175",
      E170: "Embraer E170",
      CRJ9: "Bombardier CRJ-900",
      CRJ7: "Bombardier CRJ-700",
      CRJ2: "Bombardier CRJ-200",
      DH8D: "Bombardier Q400",
      AT72: "ATR 72",
      AT76: "ATR 72-600",
    };

    return aircraftTypes[code.toUpperCase()] || code;
  };

  modalContent.innerHTML = `
    <!-- Sticky Header -->
    <div class="flight-modal-header sticky top-0 z-50 border-b border-border bg-sheet backdrop-blur-sm flex-shrink-0" style="padding: 2rem;">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-start gap-4 flex-1 min-w-0">
          <div class="flex-shrink-0" style="width: 72px; height: 72px; display: flex; align-items: flex-start; justify-content: flex-start; border: 1px solid #dcd6c8; background: #fefdf9; padding: 12px;">
            <img
              src="${getAirlineLogo(flight.airlineCode || "")}"
              alt="${escapeHtml(flight.airline)}"
              class="max-w-full max-h-full object-contain"
              style="width: 100%; height: 100%; display: block;"
              loading="eager"
              data-airline-code="${escapeHtml((flight.airlineCode || "XX").substring(0, 2).toUpperCase())}"
              data-fallback-attempt="0"
              onerror="(function(img) {
                const code = img.dataset.airlineCode || 'XX';
                let attempt = parseInt(img.dataset.fallbackAttempt || '0');
                attempt++;
                img.dataset.fallbackAttempt = attempt;
                const airlineDomains = {BA:'britishairways.com',EK:'emirates.com',SQ:'singaporeair.com',QR:'qatarairways.com',EY:'etihad.com',CX:'cathaypacific.com',JL:'jal.com',QF:'qantas.com',VS:'virgin-atlantic.com',LX:'swiss.com',OS:'austrian.com',TG:'thaiairways.com',KE:'koreanair.com',NH:'ana.co.jp',UA:'united.com',AA:'aa.com',DL:'delta.com',LH:'lufthansa.com',AF:'airfrance.com',KL:'klm.com',IB:'iberia.com',TP:'tap.pt',AC:'aircanada.com',NZ:'airnewzealand.com',BR:'evaair.com',CI:'china-airlines.com',CA:'airchina.com',MU:'ceair.com',CZ:'csair.com',TK:'turkishairlines.com',SV:'saudia.com',MS:'egyptair.com',ET:'ethiopianairlines.com',SA:'flysaa.com',KU:'kuwaitairways.com',MH:'malaysiaairlines.com',GA:'garuda-indonesia.com',PR:'philippineairlines.com',VN:'vietnamairlines.com',AI:'airindia.com',OZ:'flyasiana.com',WS:'westjet.com',VA:'virginaustralia.com',FJ:'fijiairways.com',PG:'bangkokair.com',SN:'brusselsairlines.com',TR:'flyscoot.com',WN:'southwest.com',B6:'jetblue.com',NK:'spirit.com',F9:'flyfrontier.com',AS:'alaskaair.com',HA:'hawaiianairlines.com',FR:'ryanair.com',U2:'easyjet.com',VY:'vueling.com',EW:'eurowings.com',DY:'norwegian.com',AK:'airasia.com',D7:'airasia.com',JQ:'jetstar.com',SG:'spicejet.com',G8:'goindigo.in',IX:'airindiaexpress.in',VJ:'vietjetair.com',XW:'scoot.com',TW:'twayair.com',ZE:'eastarjet.com',LJ:'jinair.com',SL:'thaismileair.com'};
                if (attempt === 1 && airlineDomains[code]) {
                  img.src = 'https://logo.clearbit.com/' + airlineDomains[code];
                } else {
                  img.onerror = null;
                  img.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(code) + '&size=64&background=f0f0f0&color=666&bold=true';
                }
              })(this)"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[0.6875rem] uppercase tracking-[0.2em] text-muted mb-1" style="color: #6d7177; margin-bottom: 0.25rem;">${escapeHtml(
              flight.airline
            )}</p>
            <h3 class="font-mono text-2xl font-bold tracking-tight mb-1" style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.25rem;">${
              (flight.airlineCode || "") + " " + (flight.flightNumber || "")
            }</h3>
            <p class="text-sm text-muted truncate" style="font-size: 0.875rem; color: #6d7177;">${escapeHtml(
              flight.originCity
            )} → ${escapeHtml(flight.destinationCity)}</p>
            <p class="text-xs text-muted mt-1" style="font-size: 0.75rem; color: #6d7177; margin-top: 0.25rem;">${formatDateTime(
              flight.scheduledDeparture
            )}</p>
          </div>
        </div>
        <div class="flex items-start gap-3 flex-shrink-0">
          <!-- Status Badge in Header -->
          <div class="flight-status-badge flex items-center gap-2 px-3 rounded-sm" data-status="${
            flight.status
          }" style="padding: 0.625rem 0.75rem; gap: 0.5rem; position: relative !important; top: auto !important; right: auto !important; height: 2.5rem;">
            <i data-lucide="${
              statusStyle.icon
            }" class="h-3.5 w-3.5" style="width: 0.875rem; height: 0.875rem;"></i>
            <span class="text-[0.6875rem] font-semibold uppercase tracking-[0.15em]" style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">${escapeHtml(
              flight.statusText || flight.status.toUpperCase()
            )}</span>
          </div>
          <button
            id="modalCloseBtn"
            class="modal-close-btn flex h-10 w-10 items-center justify-center border border-border bg-sheet shrink-0 transition-all duration-300 hover:bg-navy hover:border-navy group"
            style="width: 2.5rem; height: 2.5rem; border: 1px solid #dcd6c8; background: #fefdf9;"
            aria-label="Close modal"
          >
            <i data-lucide="x" class="h-5 w-5 text-ink group-hover:text-sheet transition-colors duration-300" style="width: 1.25rem; height: 1.25rem;"></i>
          </button>
        </div>
      </div>
      </div>

    <!-- Scrollable Content -->
    <div class="flight-modal-body px-8 py-8 space-y-8 flex-1 overflow-y-auto">
      <!-- Status and Progress Section -->
      <div class="space-y-6 border-b border-border pb-8" style="padding-bottom: 2rem; border-bottom: 1px solid #dcd6c8;">

        <!-- Route with Progress Bar - Matches Card Design -->
        <div class="relative" style="position: relative;">
          <!-- Airport Codes and Progress Bar Row -->
          <div class="flex items-center justify-between relative mb-4" style="position: relative; margin-bottom: 1rem; align-items: center;">
            <!-- Departure Airport Code -->
            <div class="flex-shrink-0" style="flex-shrink: 0; position: relative; z-index: 3; background: var(--sheet);">
              <p class="text-3xl font-bold tracking-tight" style="font-size: 1.875rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">${escapeHtml(
                flight.originAirport
              )}</p>
        </div>

            <!-- Progress Bar Container - Spans Between Airport Codes -->
            <div class="flex-1 relative mx-6" style="flex: 1 1 auto; margin-left: 1.5rem; margin-right: 2.5rem; height: 24px; position: relative; min-width: 0; z-index: 1; padding: 8px 0;">
              <!-- Background Track -->
              <div class="absolute left-0 right-0 rounded-full" style="background-color: #dcd6c8; top: 50%; margin-top: -2px; height: 4px; width: 100%;"></div>
              <!-- Progress Fill -->
              <div
                class="modal-progress-bar-${flight.id}"
                style="width: 0%; top: 50%; margin-top: -2px; left: 0;"
            data-progress="${flight.progress}"
          ></div>
              <!-- Plane Icon - Leading the progress -->
          <div
                class="modal-plane-icon-${flight.id}"
                style="left: 0%; top: 50%; transform: translateY(-50%); pointer-events: none;"
            data-progress="${flight.progress}"
          >
                <i data-lucide="plane" class="h-6 w-6" style="color: #10b981; transform: rotate(45deg); filter: drop-shadow(0 2px 8px rgba(16, 185, 129, 0.6)) drop-shadow(0 0 16px rgba(16, 185, 129, 0.4));"></i>
          </div>
        </div>

            <!-- Arrival Airport Code -->
            <div class="flex-shrink-0" style="flex-shrink: 0; position: relative; z-index: 3; background: var(--sheet);">
              <p class="text-3xl font-bold tracking-tight" style="font-size: 1.875rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">${escapeHtml(
                flight.destinationAirport
              )}</p>
            </div>
      </div>

          <!-- City and Airport Name Row -->
          <div class="flex items-start justify-between mb-4" style="margin-bottom: 1rem;">
            <!-- Departure Details -->
            <div class="flex-1" style="flex: 1 1 0%; min-width: 0; max-width: calc(50% - 3rem);">
              <p class="text-sm text-muted mb-0.5 leading-relaxed" style="font-size: 0.875rem; color: #6d7177; margin-bottom: 0.125rem; line-height: 1.5;">${escapeHtml(
                flight.originCity
              )}</p>
              <p class="text-[0.625rem] text-muted leading-tight" style="font-size: 0.625rem; color: #6d7177; opacity: 0.6; line-height: 1.3; margin-bottom: 0.75rem;">${escapeHtml(
                flight.originAirportFull || `${flight.originCity} Airport`
              )}</p>
            </div>

            <!-- Spacer for progress bar -->
            <div class="flex-1 mx-6" style="flex: 1 1 auto; margin-left: 1.5rem; margin-right: 2.5rem; min-width: 0;"></div>

            <!-- Arrival Details -->
            <div class="flex-1 text-right" style="flex: 1 1 0%; min-width: 0; max-width: calc(50% - 3rem);">
              <p class="text-sm text-muted mb-0.5 leading-relaxed" style="font-size: 0.875rem; color: #6d7177; margin-bottom: 0.125rem; line-height: 1.5;">${escapeHtml(
                flight.destinationCity
              )}</p>
              <p class="text-[0.625rem] text-muted leading-tight" style="font-size: 0.625rem; color: #6d7177; opacity: 0.6; line-height: 1.3; margin-bottom: 0.75rem;">${escapeHtml(
                flight.destinationAirportFull ||
                  `${flight.destinationCity} Airport`
              )}</p>
            </div>
          </div>

          <!-- Times Row -->
          <div class="grid grid-cols-2 gap-6">
            <!-- Departure Time -->
            <div>
              <div class="bg-canvas border border-border p-4">
                <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Departure</p>
                <p class="font-mono text-lg font-semibold mb-1">${formatDateTime(
                  flight.scheduledDeparture
                )}</p>
                ${
                  flight.departureDelay &&
                  flight.departureDelay > 0 &&
                  flight.actualDeparture
                    ? `
                <div class="mt-3 pt-3 border-t border-border">
                  <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Actual</p>
                  <p class="font-mono text-lg font-semibold" style="color: ${departureDelayColor};">${formatDateTime(
                        flight.actualDeparture
                      )}</p>
                  <p class="text-xs mt-1" style="color: ${departureDelayColor};">${getDelayText(
                        flight.departureDelay
                      )}</p>
                </div>
                `
                    : ""
                }
              </div>
            </div>

            <!-- Arrival Time -->
            <div>
              <div class="bg-canvas border border-border p-4">
                <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Arrival</p>
                <p class="font-mono text-lg font-semibold mb-1">${formatDateTime(
                  flight.scheduledArrival
                )}</p>
                ${
                  flight.arrivalDelay &&
                  flight.arrivalDelay > 0 &&
                  (flight.actualArrival || flight.estimatedArrival)
                    ? `
                <div class="mt-3 pt-3 border-t border-border">
                  <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">${
                    flight.actualArrival ? "Actual" : "Estimated"
                  }</p>
                  <p class="font-mono text-lg font-semibold" style="color: ${arrivalDelayColor};">${formatDateTime(
                        flight.actualArrival || flight.estimatedArrival
                      )}</p>
                  <p class="text-xs mt-1" style="color: ${arrivalDelayColor};">${getDelayText(
                        flight.arrivalDelay
                      )}</p>
                </div>
                `
                    : ""
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Flight Progress and Duration -->
        <div class="grid ${
          flight.progress !== null && flight.progress !== undefined
            ? "grid-cols-2"
            : "grid-cols-1"
        } gap-6">
          ${
            flight.progress !== null && flight.progress !== undefined
              ? `
          <div class="bg-canvas border border-border p-4">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs uppercase tracking-wider text-muted">Flight Progress</p>
              <p class="text-sm font-semibold">${flight.progress}%</p>
            </div>
            <div class="h-2 bg-border rounded-full overflow-hidden">
              <div class="h-full bg-emerald-500 transition-all duration-500" style="width: ${flight.progress}%"></div>
            </div>
          </div>
          `
              : ""
          }
          ${
            getActualDuration(flight)
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-xs uppercase tracking-wider text-muted mb-2">
              ${
                flight.actualDeparture && flight.actualArrival
                  ? "Actual Duration"
                  : flight.actualDeparture
                  ? "Estimated Duration"
                  : "Scheduled Duration"
              }
            </p>
            <p class="text-lg font-semibold">${getActualDuration(flight)}</p>
          </div>
          `
              : ""
          }
        </div>

        <!-- Gate and Status Info -->
        <div class="grid grid-cols-3 gap-6">
        ${
          flight.gate
            ? `
        <div>
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Departure Gate</p>
            <p class="text-xl font-semibold tracking-tight mb-1" style="margin-bottom: 0.25rem;">${escapeHtml(
              flight.gate
            )}</p>
            ${
              flight.terminal
                ? `<p class="text-sm text-muted" style="font-size: 0.875rem; color: #6d7177; margin-top: 0.25rem;">Terminal ${escapeHtml(
                    flight.terminal
                  )}</p>`
                : ""
            }
          </div>
        `
            : ""
        }
        ${
          flight.gateArrival
            ? `
        <div>
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Arrival Gate</p>
            <p class="text-xl font-semibold tracking-tight mb-1" style="margin-bottom: 0.25rem;">${escapeHtml(
              flight.gateArrival
            )}</p>
            ${
              flight.terminalArrival
                ? `<p class="text-sm text-muted" style="font-size: 0.875rem; color: #6d7177; margin-top: 0.25rem;">Terminal ${escapeHtml(
                    flight.terminalArrival
                  )}</p>`
                : ""
            }
          </div>
        `
            : ""
        }
        ${
          flight.baggageClaim
            ? `
        <div>
            <p class="text-[0.65rem] uppercase tracking-[0.3em] text-muted mb-2" style="color: #6d7177; margin-bottom: 0.5rem;">Baggage Claim</p>
            <p class="text-xl font-semibold tracking-tight">${escapeHtml(
              flight.baggageClaim
            )}</p>
          </div>
        `
            : ""
        }
          ${
            flight.statusDetail
              ? `
          <div>
            <p class="text-[0.65rem] uppercase tracking-[0.3em] text-muted mb-2" style="color: #6d7177; margin-bottom: 0.5rem;">Status</p>
            <p class="text-xl font-semibold" style="color: ${departureDelayColor};">${escapeHtml(
                  flight.statusDetail
                )}</p>
          </div>
          `
              : ""
          }
          ${
            flight.landingDetail
              ? `
          <div>
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Landing</p>
            <p class="text-xl font-semibold" style="color: ${arrivalDelayColor};">${escapeHtml(
                  flight.landingDetail
                )}</p>
          </div>
          `
              : ""
          }
        </div>
      </div>

      ${
        flight.alert
          ? `
      <div class="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3">
        <i data-lucide="info" class="h-4 w-4 text-amber-700 shrink-0 mt-0.5"></i>
        <p class="text-sm leading-relaxed text-amber-900">${escapeHtml(
          flight.alert
        )}</p>
      </div>
      `
          : ""
      }

      <!-- Actual Times Section (if available) -->
      ${
        flight.actualDeparture ||
        flight.actualArrival ||
        flight.estimatedArrival
          ? `
      <div class="border-b border-border pb-8">
        <div class="flex items-center gap-2 mb-6">
          <i data-lucide="clock" class="h-5 w-5 text-muted"></i>
          <h4 class="text-lg font-semibold">Actual Flight Times</h4>
        </div>
        <div class="grid grid-cols-2 gap-6">
          ${
            flight.actualDeparture
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Actual Departure</p>
            <p class="text-lg font-semibold">${formatDateTime(
              flight.actualDeparture
            )}</p>
            ${
              flight.departureDelay
                ? `
            <p class="text-sm mt-1" style="color: ${getDelayColor(
              flight.departureDelay
            )};">
              ${getDelayText(flight.departureDelay)}
            </p>
            `
                : ""
            }
          </div>
          `
              : ""
          }
          ${
            flight.actualArrival
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Actual Arrival</p>
            <p class="text-lg font-semibold">${formatDateTime(
              flight.actualArrival
            )}</p>
            ${
              flight.arrivalDelay
                ? `
            <p class="text-sm mt-1" style="color: ${getDelayColor(
              flight.arrivalDelay
            )};">
              ${getDelayText(flight.arrivalDelay)}
            </p>
            `
                : ""
            }
          </div>
          `
              : flight.estimatedArrival
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Estimated Arrival</p>
            <p class="text-lg font-semibold">${formatDateTime(
              flight.estimatedArrival
            )}</p>
            ${
              flight.arrivalDelay
                ? `
            <p class="text-sm mt-1" style="color: ${getDelayColor(
              flight.arrivalDelay
            )};">
              ${getDelayText(flight.arrivalDelay)}
            </p>
            `
                : ""
            }
          </div>
          `
              : ""
          }
        </div>
      </div>
      `
          : ""
      }

      <!-- Booking Information -->
      ${
        flight.bookingNumber || flight.confirmationCode || flight.ticketNumber
          ? `
      <div class="border-b border-border pb-8">
        <div class="flex items-center gap-2 mb-6">
          <i data-lucide="ticket" class="h-5 w-5 text-muted"></i>
          <h4 class="text-lg font-semibold tracking-tight">Booking Information</h4>
        </div>
        <div class="grid grid-cols-2 gap-6">
          ${
            flight.bookingNumber
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Booking Number</p>
            <p class="text-lg font-mono font-semibold">${escapeHtml(
              flight.bookingNumber
            )}</p>
          </div>
          `
              : ""
          }
          ${
            flight.confirmationCode
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Confirmation Code</p>
            <p class="text-lg font-mono font-semibold">${escapeHtml(
              flight.confirmationCode
            )}</p>
          </div>
          `
              : ""
          }
          ${
            flight.ticketNumber
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Ticket Number</p>
            <p class="text-lg font-mono font-semibold">${escapeHtml(
              flight.ticketNumber
            )}</p>
          </div>
          `
              : ""
          }
        </div>
      </div>
      `
          : ""
      }

      <!-- Aircraft Information -->
      ${
        flight.aircraftType ||
        flight.aircraftRegistration ||
        flight.aircraftAge ||
        flight.seatConfiguration ||
        (flight.aircraft &&
          (flight.aircraft.type ||
            flight.aircraft.age ||
            flight.aircraft.registration)) ||
        (flight.seatMap && flight.seatMap.configuration)
          ? `
      <div class="border-b border-border pb-8">
        <div class="flex items-center gap-2 mb-6">
          <i data-lucide="plane" class="h-5 w-5 text-muted"></i>
          <h4 class="text-lg font-semibold">Aircraft Information</h4>
        </div>
        <div class="grid grid-cols-2 gap-4">
          ${
            flight.aircraftType || (flight.aircraft && flight.aircraft.type)
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Aircraft Type</p>
            <p class="text-base font-semibold">${escapeHtml(
              getAircraftModel(
                flight.aircraftType || (flight.aircraft && flight.aircraft.type)
              )
            )}</p>
          </div>
          `
              : ""
          }
          ${
            flight.aircraftAge || (flight.aircraft && flight.aircraft.age)
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Aircraft Age</p>
            <p class="text-base font-semibold">${escapeHtml(
              flight.aircraftAge ||
                (flight.aircraft && flight.aircraft.age) ||
                "N/A"
            )}</p>
          </div>
          `
              : ""
          }
          ${
            flight.aircraftRegistration ||
            (flight.aircraft && flight.aircraft.registration)
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Registration</p>
            <p class="text-base font-mono font-semibold">${escapeHtml(
              flight.aircraftRegistration ||
                (flight.aircraft && flight.aircraft.registration) ||
                "N/A"
            )}</p>
          </div>
          `
              : ""
          }
          ${
            flight.seatConfiguration ||
            (flight.seatMap && flight.seatMap.configuration)
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Seat Configuration</p>
            <p class="text-base font-semibold">${escapeHtml(
              flight.seatConfiguration ||
                (flight.seatMap && flight.seatMap.configuration) ||
                "N/A"
            )}</p>
          </div>
          `
              : ""
          }
        </div>
      </div>
      `
          : ""
      }

      <!-- Your Seat Information -->
      ${
        flight.seatNumber || flight.seatClass
          ? `
      <div class="border-b border-border pb-8">
        <div class="flex items-center gap-2 mb-6">
          <i data-lucide="armchair" class="h-5 w-5 text-muted"></i>
          <h4 class="text-lg font-semibold">Your Seat</h4>
        </div>
        <div class="grid grid-cols-2 gap-6 mb-6">
          ${
            flight.seatNumber
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Seat Number</p>
            <p class="text-lg font-mono font-semibold">${escapeHtml(
              flight.seatNumber
            )}</p>
          </div>
          `
              : ""
          }
          ${
            flight.seatClass
              ? `
          <div class="bg-canvas border border-border p-4">
            <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-2">Class</p>
            <p class="text-lg font-semibold">${escapeHtml(flight.seatClass)}</p>
          </div>
          `
              : ""
          }
        </div>
        ${
          flight.seatAmenities
            ? `
        <div class="bg-canvas border border-border p-4">
          <p class="text-[0.625rem] uppercase tracking-[0.15em] text-muted mb-3">Amenities</p>
          <p class="text-sm text-muted">${escapeHtml(flight.seatAmenities)}</p>
        </div>
        `
            : ""
        }
      </div>
      `
          : ""
      }

      <!-- Data Information Footer -->
      ${
        flight.apiLastSynced
          ? `
      <div class="pt-8 mt-2">
        <div class="bg-canvas border border-border rounded-sm px-4 py-3">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <i data-lucide="database" class="h-4 w-4 text-muted flex-shrink-0"></i>
              <span class="text-xs text-muted">Last updated ${
                formatRelativeTime(flight.apiLastSynced) ||
                formatDateTime(flight.apiLastSynced)
              }</span>
            </div>
            ${
              flight.apiFlightId
                ? `
            <div class="flex items-center gap-2 flex-shrink-0">
              <i data-lucide="hash" class="h-3.5 w-3.5 text-muted opacity-50"></i>
              <span class="font-mono text-[0.625rem] text-muted opacity-60">${escapeHtml(
                flight.apiFlightId
              ).substring(0, 18)}...</span>
            </div>
            `
                : ""
            }
          </div>
        </div>
      </div>
      `
          : ""
      }

    </div>
  `;

  // Render Lucide icons
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }

  // Add close button event listener
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeFlightDetailsModal);
  }

  // Animate modal entrance
  requestAnimationFrame(() => {
    modal.style.pointerEvents = "auto";
    modal.classList.remove("opacity-0");
    modal.classList.add("opacity-100");

    const modalContainer = document.getElementById("flightModalContainer");
    if (modalContainer) {
      modalContainer.style.transition =
        "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
      modalContainer.style.transform = "scale(1)";
    }
  });

  // Animate progress bar and plane
  setTimeout(() => {
    const progressBar = modalContent.querySelector(
      `.modal-progress-bar-${flight.id}`
    );
    const planeIcon = modalContent.querySelector(
      `.modal-plane-icon-${flight.id}`
    );

    if (progressBar && planeIcon) {
      const targetProgress = parseFloat(progressBar.dataset.progress) || 0;

      // Force a reflow
      void progressBar.offsetHeight;
      void planeIcon.offsetHeight;

      // Set initial state
      progressBar.style.width = "0%";
      planeIcon.style.left = "0%";

      // Animate
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          progressBar.style.transition =
            "width 2.5s cubic-bezier(0.16, 1, 0.3, 1)";
          progressBar.style.width = `${targetProgress}%`;

          // Position plane at the end of the progress bar
          const planePosition =
            targetProgress > 0 ? Math.min(targetProgress, 100) : 0; // Position at the end of progress bar
          planeIcon.style.transition =
            "left 2.5s cubic-bezier(0.16, 1, 0.3, 1)";
          planeIcon.style.left = `${planePosition}%`;
        });
      });
    }
  }, 200);

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

function closeFlightDetailsModal() {
  const modal = document.getElementById("flightDetailsModal");
  const modalContainer = document.getElementById("flightModalContainer");

  if (!modal) return;

  if (modalContainer) {
    modalContainer.style.transition =
      "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    modalContainer.style.transform = "scale(0.95)";
  }

  setTimeout(() => {
    modal.style.pointerEvents = "none";
    modal.classList.remove("opacity-100");
    modal.classList.add("opacity-0");
  }, 100);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handles viewing trip details
 */
function viewTrip(tripId) {
  console.log("View trip:", tripId);
}

/**
 * Handles editing a trip
 */
function editTrip(tripId) {
  console.log("Edit trip:", tripId);
}

/**
 * Handles navbar scroll detection
 */
function handleNavbarScroll() {
  const header = document.getElementById("mainHeader");
  if (!header) return;

  const scrollThreshold = 20;
  const scrollY = window.scrollY || window.pageYOffset;

  if (scrollY > scrollThreshold) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
}

/**
 * Initializes user dropdown functionality
 */
function initializeUserDropdown() {
  const userChip = document.getElementById("userChip");
  const userDropdown = document.getElementById("userDropdown");
  const userDropdownBackdrop = document.getElementById("userDropdownBackdrop");

  if (userChip && userDropdown) {
    userChip.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = !userDropdown.classList.contains("invisible");

      if (isVisible) {
        userDropdown.classList.add("invisible", "opacity-0");
        userDropdown.classList.remove("active");
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.add("hidden");
          userDropdownBackdrop.classList.remove("active");
        }
      } else {
        userDropdown.classList.remove("invisible", "opacity-0");
        userDropdown.classList.add("active");
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.remove("hidden");
          userDropdownBackdrop.classList.add("active");
        }
      }
    });

    if (userDropdownBackdrop) {
      userDropdownBackdrop.addEventListener("click", () => {
        userDropdown.classList.add("invisible", "opacity-0");
        userDropdown.classList.remove("active");
        userDropdownBackdrop.classList.add("hidden");
        userDropdownBackdrop.classList.remove("active");
      });
    }

    // Handle dropdown item clicks
    const dropdownItems = userDropdown.querySelectorAll(".dropdown-item");
    dropdownItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const action = item.getAttribute("data-action");
        console.log("Dropdown action:", action);

        userDropdown.classList.add("invisible", "opacity-0");
        userDropdown.classList.remove("active");
        if (userDropdownBackdrop) {
          userDropdownBackdrop.classList.add("hidden");
          userDropdownBackdrop.classList.remove("active");
        }

        // Handle actions
        if (action === "profile") {
          window.location.href = "/profile";
        } else if (action === "settings") {
          window.location.href = "/settings";
        } else if (action === "admin") {
          // Admin page - server-side middleware will verify admin access
          window.location.href = "/admin";
        } else if (action === "logout") {
          // Use AuthService for secure logout following SOLID principles
          AuthService.logout();
        }
      });
    });
  }
}

// ============================================================================
// ANIMATION INITIALIZERS
// ============================================================================

/**
 * Initializes scroll reveal animations
 */
function initializeScrollReveal() {
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

/**
 * Initializes footer animations with staggered reveals
 * Jony Ive style: subtle, precise, elegant
 */
function initializeFooterAnimations() {
  const footer = document.querySelector("footer");
  if (!footer) return;

  const observerOptions = {
    threshold: 0.2,
    rootMargin: "0px 0px 0px 0px",
  };

  const footerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Reveal footer sections
        const sections = footer.querySelectorAll(".footer-section");
        sections.forEach((section, index) => {
          setTimeout(() => {
            section.classList.add("revealed");
          }, index * 100);
        });

        // Stagger reveal footer links
        const links = footer.querySelectorAll(".footer-link");
        links.forEach((link, index) => {
          setTimeout(() => {
            link.classList.add("revealed");
          }, 300 + index * 30);
        });

        footerObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  footerObserver.observe(footer);
}

// ============================================================================
// FEATURE CARD INTERACTIONS
// ============================================================================

/**
 * Initializes feature card click handlers
 */
function initializeFeatureCards() {
  const featureCards = document.querySelectorAll("[data-feature]");
  featureCards.forEach((card) => {
    card.addEventListener("click", () => {
      const feature = card.getAttribute("data-feature");
      console.log("Feature clicked:", feature);
      // Handle feature navigation
    });
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize user profile (now async)
  await initializeUserProfile();

  // Load data
  loadTrips();
  loadFlights();

  // Initialize UI
  initializeScrollReveal();
  initializeFooterAnimations();
  initializeUserDropdown();
  initializeFeatureCards();

  // Navbar scroll detection
  let scrollTimeout;
  window.addEventListener("scroll", () => {
    if (scrollTimeout) {
      cancelAnimationFrame(scrollTimeout);
    }
    scrollTimeout = requestAnimationFrame(handleNavbarScroll);
  });
  handleNavbarScroll();

  // Flight modal close button
  const closeModalBtn = document.getElementById("closeFlightModal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeFlightDetailsModal);
  }

  // Close modal on backdrop click
  const modal = document.getElementById("flightDetailsModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeFlightDetailsModal();
      }
    });
  }

  // Initialize flight modals
  initializeFlightModals();

  // Initialize Lucide icons
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
});

// ============================================================================
// FLIGHT SEARCH AND BOOKING MODALS
// ============================================================================

let selectedFlightData = null; // Stores the selected flight from search

/**
 * Opens the flight search modal
 */
function openFlightSearchModal() {
  const modal = document.getElementById("flightSearchModal");
  if (!modal) return;

  // Reset form
  document.getElementById("flightSearchNumber").value = "";
  // Set default date to today
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("flightSearchDate").value = today;
  document.getElementById("flightSearchError").classList.add("hidden");
  document.getElementById("flightSearchLoading").classList.add("hidden");
  document.getElementById("flightSearchResults").innerHTML = "";

  // Show modal
  modal.style.opacity = "1";
  modal.style.pointerEvents = "auto";
}

/**
 * Closes the flight search modal
 */
function closeFlightSearchModal() {
  const modal = document.getElementById("flightSearchModal");
  if (!modal) return;

  modal.style.opacity = "0";
  modal.style.pointerEvents = "none";
}

/**
 * Opens the flight booking details modal
 */
function openFlightBookingModal(flightData) {
  const modal = document.getElementById("flightBookingModal");
  if (!modal) return;

  selectedFlightData = flightData;

  // Populate selected flight summary
  const summary = document.getElementById("selectedFlightSummary");
  summary.innerHTML = `
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-semibold">${escapeHtml(
          flightData.airline
        )} ${escapeHtml(flightData.flightNumber)}</span>
        <span class="text-sm text-muted">${escapeHtml(flightData.status)}</span>
      </div>
      <div class="text-sm">
        <span class="font-medium">${escapeHtml(
          flightData.originCity
        )} (${escapeHtml(flightData.originAirport)})</span>
        <span class="mx-2">→</span>
        <span class="font-medium">${escapeHtml(
          flightData.destinationCity
        )} (${escapeHtml(flightData.destinationAirport)})</span>
      </div>
      <div class="text-sm text-muted">
        ${formatDate(flightData.scheduledDeparture)} ${formatTimeInTimezone(
    flightData.scheduledDeparture,
    flightData.originTimezone
  )}
      </div>
    </div>
  `;

  // Reset form
  document.getElementById("bookingNumber").value = "";
  document.getElementById("ticketNumber").value = "";
  document.getElementById("seatNumber").value = "";
  document.getElementById("seatClass").value = "";
  document.getElementById("gate").value = flightData.gate || "";
  document.getElementById("flightBookingError").classList.add("hidden");
  document.getElementById("flightBookingLoading").classList.add("hidden");

  // Show modal
  modal.style.opacity = "1";
  modal.style.pointerEvents = "auto";
}

/**
 * Closes the flight booking details modal
 */
function closeFlightBookingModal() {
  const modal = document.getElementById("flightBookingModal");
  if (!modal) return;

  modal.style.opacity = "0";
  modal.style.pointerEvents = "none";
  selectedFlightData = null;
}

/**
 * Searches for flights using the API
 */
async function searchFlights() {
  const flightNumber = document
    .getElementById("flightSearchNumber")
    .value.trim();
  const dateInput = document.getElementById("flightSearchDate");
  const date = dateInput.value || selectedDate;
  const errorDiv = document.getElementById("flightSearchError");
  const loadingDiv = document.getElementById("flightSearchLoading");

  // Note: AeroAPI has its own date range limitations (typically 24-48 hours forward)
  // We'll let the API handle validation and show appropriate errors
  const resultsDiv = document.getElementById("flightSearchResults");

  // Hide error, show loading
  errorDiv.classList.add("hidden");
  loadingDiv.classList.remove("hidden");
  resultsDiv.innerHTML = "";

  // Validate input
  if (!flightNumber) {
    errorDiv.textContent = "Please enter a flight number";
    errorDiv.classList.remove("hidden");
    loadingDiv.classList.add("hidden");
    return;
  }

  if (!date || date === "Select date") {
    errorDiv.textContent = "Please select a date";
    errorDiv.classList.remove("hidden");
    loadingDiv.classList.add("hidden");
    return;
  }

  let dateValue = date;
  if (dateValue && !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      dateValue = parsedDate.toISOString().split("T")[0];
    } else {
      errorDiv.textContent = "Invalid date format";
      errorDiv.classList.remove("hidden");
      loadingDiv.classList.add("hidden");
      return;
    }
  }

  try {
    const response = await fetch("/api/flights/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ flightNumber, date: dateValue }),
    });

    const data = await response.json();

    loadingDiv.classList.add("hidden");

    if (!response.ok) {
      errorDiv.textContent = data.error || "Failed to search flights";
      errorDiv.classList.remove("hidden");
      return;
    }

    if (!data.flights || data.flights.length === 0) {
      errorDiv.textContent = "No flights found for this flight number and date";
      errorDiv.classList.remove("hidden");
      return;
    }

    // Display results with animation
    resultsDiv.innerHTML = data.flights
      .map((flight, index) => {
        const flightJson = JSON.stringify(flight).replace(/'/g, "&#39;");
        return `
      <div class="flight-result-item border border-border bg-sheet p-4 cursor-pointer transition hover:border-navy hover:bg-canvas" data-flight-index="${index}" data-flight-data='${flightJson}' style="transition-delay: ${
          index * 0.05
        }s">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-ink">${escapeHtml(
            flight.airline
          )} ${escapeHtml(flight.airlineCode)}${escapeHtml(
          flight.flightNumber
        )}</span>
          <span class="text-sm font-medium text-muted">${escapeHtml(
            flight.status
          )}</span>
        </div>
        <div class="text-sm text-ink mb-1">
          <span class="font-medium">${escapeHtml(
            flight.originCity
          )} (${escapeHtml(flight.originAirport)})</span>
          <span class="mx-2 text-muted">→</span>
          <span class="font-medium">${escapeHtml(
            flight.destinationCity
          )} (${escapeHtml(flight.destinationAirport)})</span>
        </div>
        <div class="text-sm text-muted">
          ${formatDate(flight.scheduledDeparture)} ${formatTimeInTimezone(
          flight.scheduledDeparture,
          flight.originTimezone
        )} - ${formatTimeInTimezone(
          flight.scheduledArrival,
          flight.destinationTimezone
        )}
        </div>
      </div>
    `;
      })
      .join("");

    // Animate results in
    setTimeout(() => {
      resultsDiv.querySelectorAll(".flight-result-item").forEach((item) => {
        item.classList.add("visible");
      });
    }, 10);

    // Add click listeners to result items
    resultsDiv.querySelectorAll("[data-flight-index]").forEach((item) => {
      item.addEventListener("click", () => {
        const flightData = JSON.parse(item.getAttribute("data-flight-data"));
        selectFlightFromSearch(flightData);
      });
    });

    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  } catch (error) {
    loadingDiv.classList.add("hidden");
    errorDiv.textContent = "An error occurred while searching flights";
    errorDiv.classList.remove("hidden");
    console.error("Flight search error:", error);
  }
}

/**
 * Selects a flight from search results and opens booking modal
 */
function selectFlightFromSearch(flightData) {
  // Ensure dates are Date objects (API returns ISO strings)
  const flight = {
    ...flightData,
    scheduledDeparture: flightData.scheduledDeparture
      ? new Date(flightData.scheduledDeparture)
      : null,
    scheduledArrival: flightData.scheduledArrival
      ? new Date(flightData.scheduledArrival)
      : null,
    actualDeparture: flightData.actualDeparture
      ? new Date(flightData.actualDeparture)
      : null,
    estimatedArrival: flightData.estimatedArrival
      ? new Date(flightData.estimatedArrival)
      : null,
    actualArrival: flightData.actualArrival
      ? new Date(flightData.actualArrival)
      : null,
  };

  closeFlightSearchModal();
  openFlightBookingModal(flight);
}

/**
 * Saves flight with booking details to database
 */
async function saveFlight() {
  if (!selectedFlightData) {
    return;
  }

  const bookingNumber = document.getElementById("bookingNumber").value.trim();
  const ticketNumber = document.getElementById("ticketNumber").value.trim();
  const seatNumber = document.getElementById("seatNumber").value.trim();
  const seatClass = document.getElementById("seatClass").value;
  const gate = document.getElementById("gate").value.trim();
  const errorDiv = document.getElementById("flightBookingError");
  const loadingDiv = document.getElementById("flightBookingLoading");

  // Hide error, show loading
  errorDiv.classList.add("hidden");
  loadingDiv.classList.remove("hidden");

  // Validate required fields
  if (!bookingNumber) {
    errorDiv.textContent = "Booking number is required";
    errorDiv.classList.remove("hidden");
    loadingDiv.classList.add("hidden");
    return;
  }

  if (!seatNumber) {
    errorDiv.textContent = "Seat number is required";
    errorDiv.classList.remove("hidden");
    loadingDiv.classList.add("hidden");
    return;
  }

  if (!seatClass) {
    errorDiv.textContent = "Seat class is required";
    errorDiv.classList.remove("hidden");
    loadingDiv.classList.add("hidden");
    return;
  }

  try {
    // Prepare flight data with dates as ISO strings for API
    const flightDataForAPI = {
      ...selectedFlightData,
      scheduledDeparture:
        selectedFlightData.scheduledDeparture instanceof Date
          ? selectedFlightData.scheduledDeparture.toISOString()
          : selectedFlightData.scheduledDeparture,
      scheduledArrival:
        selectedFlightData.scheduledArrival instanceof Date
          ? selectedFlightData.scheduledArrival.toISOString()
          : selectedFlightData.scheduledArrival,
      actualDeparture:
        selectedFlightData.actualDeparture instanceof Date
          ? selectedFlightData.actualDeparture.toISOString()
          : selectedFlightData.actualDeparture || null,
      estimatedArrival:
        selectedFlightData.estimatedArrival instanceof Date
          ? selectedFlightData.estimatedArrival.toISOString()
          : selectedFlightData.estimatedArrival || null,
      actualArrival:
        selectedFlightData.actualArrival instanceof Date
          ? selectedFlightData.actualArrival.toISOString()
          : selectedFlightData.actualArrival || null,
    };

    const response = await fetch("/api/flights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        flightData: flightDataForAPI,
        bookingDetails: {
          bookingNumber,
          confirmationCode: bookingNumber, // Use booking number as confirmation code if not provided separately
          ticketNumber: ticketNumber || null,
          seatNumber,
          seatClass,
          gate: gate || null,
        },
      }),
    });

    const data = await response.json();
    loadingDiv.classList.add("hidden");

    if (!response.ok) {
      errorDiv.textContent = data.error || "Failed to save flight";
      errorDiv.classList.remove("hidden");
      return;
    }

    // Success - close modal and reload flights
    closeFlightBookingModal();
    await loadFlights();

    // Show success message (optional)
    console.log("Flight saved successfully");
  } catch (error) {
    loadingDiv.classList.add("hidden");
    errorDiv.textContent = "An error occurred while saving the flight";
    errorDiv.classList.remove("hidden");
    console.error("Save flight error:", error);
  }
}

/**
 * Helper function to format time from Date object
 */
function formatTime(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Helper function to format date from Date object
 */
function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

let currentDatePickerMonth = new Date().getMonth();
let currentDatePickerYear = new Date().getFullYear();
let selectedDate = null;

function initializeCustomDatePicker() {
  const dateInput = document.getElementById("flightSearchDate");
  const datePicker = document.getElementById("flightDatePicker");
  const datePickerDays = document.getElementById("datePickerDays");
  const datePickerMonthYear = document.getElementById("datePickerMonthYear");
  const prevMonthBtn = document.getElementById("datePickerPrevMonth");
  const nextMonthBtn = document.getElementById("datePickerNextMonth");
  const todayBtn = document.getElementById("flightDateToday");
  const tomorrowBtn = document.getElementById("flightDateTomorrow");
  const datePickerButtons = document.getElementById("datePickerButtons");

  // Force apply button container padding via JavaScript to ensure it's applied
  if (datePickerButtons) {
    datePickerButtons.style.setProperty("padding", "0.75rem", "important");
    datePickerButtons.style.setProperty(
      "box-sizing",
      "border-box",
      "important"
    );
    datePickerButtons.style.setProperty("margin", "0", "important");
  }

  if (!dateInput || !datePicker || !datePickerDays || !datePickerMonthYear) {
    console.error("Date picker elements not found:", {
      dateInput: !!dateInput,
      datePicker: !!datePicker,
      datePickerDays: !!datePickerDays,
      datePickerMonthYear: !!datePickerMonthYear,
      prevMonthBtn: !!prevMonthBtn,
      nextMonthBtn: !!nextMonthBtn,
      todayBtn: !!todayBtn,
      tomorrowBtn: !!tomorrowBtn,
    });
    return;
  }

  console.log("Date picker initialized successfully");

  // Simple, reliable positioning - UX first approach
  function positionDatePicker() {
    if (!dateInput || !datePicker) return;

    const gap = 8; // Small gap between input and picker
    const padding = 16; // Safe padding from viewport edges

    // Get dimensions
    const inputRect = dateInput.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Picker dimensions (compact design: 300px wide, ~380px tall)
    const pickerWidth = 300;
    const pickerHeight = 380; // Reduced height with compact design

    // HORIZONTAL: Center under input, with viewport bounds
    let left = inputRect.left + (inputRect.width - pickerWidth) / 2;
    left = Math.max(
      padding,
      Math.min(left, viewportWidth - pickerWidth - padding)
    );

    // VERTICAL: Simple logic - try below, else above, else best fit
    let top;
    const spaceBelow = viewportHeight - inputRect.bottom - padding;
    const spaceAbove = inputRect.top - padding;

    if (spaceBelow >= pickerHeight + gap) {
      // Fits below - preferred
      top = inputRect.bottom + gap;
    } else if (spaceAbove >= pickerHeight + gap) {
      // Fits above
      top = inputRect.top - pickerHeight - gap;
    } else {
      // Doesn't fit either place - center in largest space
      if (spaceBelow > spaceAbove) {
        // Use space below, with scrolling if needed
        top = inputRect.bottom + gap;
      } else {
        // Use space above, with scrolling if needed
        top = padding;
      }
    }

    // Safety bounds
    top = Math.max(
      padding,
      Math.min(top, viewportHeight - pickerHeight - padding)
    );

    // Apply max-height to ensure it fits
    const maxHeight = viewportHeight - 2 * padding;
    datePicker.style.setProperty("max-height", `${maxHeight}px`, "important");

    // Position it
    datePicker.style.setProperty("position", "fixed", "important");
    datePicker.style.setProperty("top", `${Math.round(top)}px`, "important");
    datePicker.style.setProperty("left", `${Math.round(left)}px`, "important");
    datePicker.style.setProperty("width", `${pickerWidth}px`, "important");
  }

  // Reposition on window resize with debounce
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (!datePicker.classList.contains("hidden")) {
        positionDatePicker();
      }
    }, 150);
  });

  // Reposition on scroll (if picker is open) - use viewport-relative positioning
  window.addEventListener(
    "scroll",
    () => {
      if (!datePicker.classList.contains("hidden")) {
        // With fixed positioning, we don't need to reposition on scroll
        // But we'll do it anyway to ensure it stays aligned if input moves
        requestAnimationFrame(() => {
          positionDatePicker();
        });
      }
    },
    { passive: true }
  );

  // Reposition when modal content scrolls (if applicable)
  const modalContent = dateInput.closest('[class*="max-w-2xl"]');
  if (modalContent) {
    modalContent.addEventListener(
      "scroll",
      () => {
        if (!datePicker.classList.contains("hidden")) {
          requestAnimationFrame(() => {
            positionDatePicker();
          });
        }
      },
      { passive: true }
    );
  }

  function formatDateForDisplay(date) {
    if (!date) return "Select date";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateForInput(date) {
    return date.toISOString().split("T")[0];
  }

  function renderCalendar() {
    console.log("renderCalendar called", {
      datePickerDays: !!datePickerDays,
      datePickerMonthYear: !!datePickerMonthYear,
      month: currentDatePickerMonth,
      year: currentDatePickerYear,
    });

    const firstDay = new Date(currentDatePickerYear, currentDatePickerMonth, 1);
    const lastDay = new Date(
      currentDatePickerYear,
      currentDatePickerMonth + 1,
      0
    );
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    datePickerMonthYear.textContent = `${monthNames[currentDatePickerMonth]} ${currentDatePickerYear}`;

    datePickerDays.innerHTML = "";
    // Ensure grid layout is applied
    datePickerDays.style.display = "grid";
    datePickerDays.style.gridTemplateColumns = "repeat(7, 1fr)";
    datePickerDays.style.gap = "0.25rem";
    datePickerDays.style.width = "100%";
    console.log(
      `Rendering ${daysInMonth} days for ${monthNames[currentDatePickerMonth]} ${currentDatePickerYear}`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Prevent navigating to past months (can't add flights to the past)
    // Only disable if going back would go to a month entirely before current month
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isPrevMonthInPast =
      currentDatePickerYear < currentYear ||
      (currentDatePickerYear === currentYear &&
        currentDatePickerMonth <= currentMonth);

    if (prevMonthBtn) {
      prevMonthBtn.disabled = isPrevMonthInPast;
      prevMonthBtn.style.opacity = isPrevMonthInPast ? "0.3" : "1";
      prevMonthBtn.style.cursor = isPrevMonthInPast ? "not-allowed" : "pointer";
    }

    // Allow navigating to future months
    if (nextMonthBtn) {
      nextMonthBtn.disabled = false;
      nextMonthBtn.style.opacity = "1";
      nextMonthBtn.style.cursor = "pointer";
    }

    for (let i = 0; i < startingDayOfWeek; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "date-picker-day other-month";
      datePickerDays.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement("button");
      dayElement.type = "button";
      dayElement.setAttribute("data-day", day);
      dayElement.textContent = day;

      const currentDate = new Date(
        currentDatePickerYear,
        currentDatePickerMonth,
        day
      );
      currentDate.setHours(0, 0, 0, 0);

      const isToday = currentDate.getTime() === today.getTime();
      const isSelected =
        selectedDate &&
        currentDate.getTime() === new Date(selectedDate).setHours(0, 0, 0, 0);
      const isPast = currentDate < today;

      // Staggered fade-in animation for dates
      dayElement.style.opacity = "0";
      dayElement.style.transform = "scale(0.8)";
      dayElement.style.transition = "none";

      // Add CSS classes for styling (CSS now properly defined in home.html)
      if (isToday) {
        dayElement.classList.add("today");
      }
      if (isSelected) {
        dayElement.classList.add("selected");
      }
      if (isPast) {
        dayElement.classList.add("past");
        dayElement.disabled = true;
        dayElement.title = "Past dates not available";
      } else {
        const dateStr = currentDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        dayElement.title = `Select ${dateStr}`;
      }

      dayElement.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isPast) {
          return;
        }

        // Use the exact date values to avoid timezone issues
        const year = currentDatePickerYear;
        const month = String(currentDatePickerMonth + 1).padStart(2, "0");
        const dayStr = String(day).padStart(2, "0");
        selectedDate = `${year}-${month}-${dayStr}`;
        dateInput.value = selectedDate;
        dateInput.placeholder = formatDateForDisplay(selectedDate);

        // Clear any error messages
        const errorDiv = document.getElementById("flightSearchError");
        if (errorDiv) {
          errorDiv.classList.add("hidden");
        }

        renderCalendar(); // Re-render to show selection
        // Close picker after brief delay to show selection
        setTimeout(() => {
          datePicker.classList.add("hidden");
        }, 200);
      });

      datePickerDays.appendChild(dayElement);

      // Debug: verify text is set
      if (day === 1) {
        console.log("First day element:", {
          textContent: dayElement.textContent,
          innerHTML: dayElement.innerHTML,
          computedStyle: window.getComputedStyle(dayElement).color,
          display: window.getComputedStyle(dayElement).display,
          visibility: window.getComputedStyle(dayElement).visibility,
          opacity: window.getComputedStyle(dayElement).opacity,
        });
      }
    }
    console.log(
      `Added ${datePickerDays.children.length} day buttons to datePickerDays`
    );
    console.log("Date picker days container:", {
      children: datePickerDays.children.length,
      display: window.getComputedStyle(datePickerDays).display,
      gridTemplateColumns:
        window.getComputedStyle(datePickerDays).gridTemplateColumns,
    });

    const remainingDays = 42 - (startingDayOfWeek + daysInMonth);
    for (let i = 0; i < remainingDays; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "date-picker-day other-month";
      datePickerDays.appendChild(emptyDay);
    }

    // Calculate number of rows needed
    const totalCells = startingDayOfWeek + daysInMonth + remainingDays;
    const numberOfRows = Math.ceil(totalCells / 7);

    // Calculate responsive height based on rows - more accurate measurements
    const headerHeight = 100; // Month header (64px) + day labels (36px)
    const buttonSectionHeight = 68; // Today/Tomorrow buttons section (1rem padding = 16px top + 16px bottom = 32px, button ~36px)
    const rowHeight = 40.25; // Height per row (40px button + 0.25rem gap = ~4px)
    const contentPadding = 32; // Top and bottom padding of content (p-4 = 16px * 2)
    const calculatedHeight =
      headerHeight +
      numberOfRows * rowHeight +
      buttonSectionHeight +
      contentPadding;

    // Always set transition for smooth height animation
    const currentHeight = datePicker.style.height
      ? parseFloat(datePicker.style.height)
      : null;

    console.log("Date picker height calculation:", {
      currentHeight,
      calculatedHeight,
      numberOfRows,
      headerHeight,
      buttonSectionHeight,
      rowHeight,
      contentPadding,
    });

    if (currentHeight === null) {
      // First render - set initial height without animation
      datePicker.style.setProperty(
        "height",
        `${calculatedHeight}px`,
        "important"
      );
      // Set transition for future changes after a brief delay
      setTimeout(() => {
        datePicker.style.setProperty(
          "transition",
          "height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          "important"
        );
      }, 50);
    } else if (Math.abs(currentHeight - calculatedHeight) > 1) {
      // Height is changing - ensure transition is set and animate
      datePicker.style.setProperty(
        "transition",
        "height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "important"
      );
      // Force reflow to ensure transition is applied
      void datePicker.offsetHeight;
      // Set new height - browser will animate
      requestAnimationFrame(() => {
        datePicker.style.setProperty(
          "height",
          `${calculatedHeight}px`,
          "important"
        );
      });
    } else {
      // Height is the same, just ensure it's set
      datePicker.style.setProperty(
        "height",
        `${calculatedHeight}px`,
        "important"
      );
    }

    // Ensure content is visible after render (unless we're in a month transition)
    const content = datePicker.querySelector(".date-picker-content");
    if (content && content.style.opacity !== "0") {
      content.style.opacity = "1";
      content.style.transform = "translateX(0)";
    }

    // Quick fade-in animation for date cells
    requestAnimationFrame(() => {
      const allDayCells = datePickerDays.querySelectorAll("button[data-day]");
      allDayCells.forEach((cell, index) => {
        const delay = index * 8; // 8ms stagger - faster
        setTimeout(() => {
          cell.style.transition = "opacity 0.2s ease, transform 0.2s ease";
          cell.style.opacity = "1";
          cell.style.transform = "scale(1)";
        }, delay);
      });
    });

    // Reposition after height change to ensure it stays on screen
    // Use double RAF to ensure height is fully applied
    if (
      typeof positionDatePicker === "function" &&
      !datePicker.classList.contains("hidden")
    ) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          positionDatePicker();
        });
      });
    }

    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  dateInput.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = datePicker.classList.contains("hidden");
    datePicker.classList.toggle("hidden");

    if (!isHidden) {
      // Use double RAF to ensure DOM is fully updated before positioning
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          positionDatePicker();
        });
      });
    }
  });

  prevMonthBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Fade out animation
    const content = datePicker.querySelector(".date-picker-content");
    if (content) {
      content.style.transition =
        "opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)";
      content.style.opacity = "0";
      content.style.transform = "translateX(10px)";
    }

    setTimeout(() => {
      currentDatePickerMonth--;
      if (currentDatePickerMonth < 0) {
        currentDatePickerMonth = 11;
        currentDatePickerYear--;
      }
      renderCalendar();

      // Fade in animation
      if (content) {
        requestAnimationFrame(() => {
          content.style.transition =
            "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
          content.style.opacity = "1";
          content.style.transform = "translateX(0)";
        });
      }
    }, 150);
  });

  nextMonthBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Fade out animation
    const content = datePicker.querySelector(".date-picker-content");
    if (content) {
      content.style.transition =
        "opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)";
      content.style.opacity = "0";
      content.style.transform = "translateX(-10px)";
    }

    setTimeout(() => {
      currentDatePickerMonth++;
      if (currentDatePickerMonth > 11) {
        currentDatePickerMonth = 0;
        currentDatePickerYear++;
      }
      renderCalendar();

      // Fade in animation
      if (content) {
        requestAnimationFrame(() => {
          content.style.transition =
            "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
          content.style.opacity = "1";
          content.style.transform = "translateX(0)";
        });
      }
    }, 150);
  });

  todayBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    selectedDate = `${year}-${month}-${day}`;
    dateInput.value = selectedDate;
    dateInput.placeholder = formatDateForDisplay(selectedDate);
    currentDatePickerMonth = today.getMonth();
    currentDatePickerYear = today.getFullYear();
    renderCalendar();
    // Close after brief delay to show selection
    setTimeout(() => {
      datePicker.classList.add("hidden");
    }, 300);
  });

  tomorrowBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    selectedDate = `${year}-${month}-${day}`;
    dateInput.value = selectedDate;
    dateInput.placeholder = formatDateForDisplay(selectedDate);
    currentDatePickerMonth = tomorrow.getMonth();
    currentDatePickerYear = tomorrow.getFullYear();
    renderCalendar();
    // Close after brief delay to show selection
    setTimeout(() => {
      datePicker.classList.add("hidden");
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!datePicker.contains(e.target) && e.target !== dateInput) {
      datePicker.classList.add("hidden");
    }
  });

  // Keyboard navigation support
  dateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      datePicker.classList.toggle("hidden");
      if (!datePicker.classList.contains("hidden")) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            positionDatePicker();
            // Focus first available day
            const firstAvailableDay = datePicker.querySelector(
              "#datePickerDays button:not(:disabled)"
            );
            if (firstAvailableDay) {
              firstAvailableDay.focus();
            }
          });
        });
      }
    } else if (e.key === "Escape") {
      datePicker.classList.add("hidden");
    }
  });

  // Arrow key navigation within date picker
  datePicker.addEventListener("keydown", (e) => {
    if (
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"].includes(
        e.key
      )
    ) {
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      datePicker.classList.add("hidden");
      dateInput.focus();
      return;
    }

    const focusedElement = document.activeElement;
    if (!focusedElement || !focusedElement.matches("#datePickerDays button")) {
      return;
    }

    e.preventDefault();
    const allDays = Array.from(
      datePicker.querySelectorAll("#datePickerDays button:not(:disabled)")
    );
    const currentIndex = allDays.indexOf(focusedElement);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (e.key) {
      case "ArrowLeft":
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case "ArrowRight":
        nextIndex = Math.min(allDays.length - 1, currentIndex + 1);
        break;
      case "ArrowUp":
        nextIndex = Math.max(0, currentIndex - 7);
        break;
      case "ArrowDown":
        nextIndex = Math.min(allDays.length - 1, currentIndex + 7);
        break;
    }

    if (allDays[nextIndex]) {
      allDays[nextIndex].focus();
    }
  });

  renderCalendar();
}

/**
 * Initializes flight modal event listeners
 */
function initializeFlightModals() {
  // Add Flight button handlers
  const addFlightBtn = document.getElementById("addFlightBtn");
  const addFlightQuickBtn = document.getElementById("addFlightQuickBtn");

  if (addFlightBtn) {
    addFlightBtn.addEventListener("click", openFlightSearchModal);
  }
  if (addFlightQuickBtn) {
    addFlightQuickBtn.addEventListener("click", openFlightSearchModal);
  }

  // Flight Search Modal handlers
  const closeFlightSearchModalBtn = document.getElementById(
    "closeFlightSearchModal"
  );
  if (closeFlightSearchModalBtn) {
    closeFlightSearchModalBtn.addEventListener("click", closeFlightSearchModal);
  }

  const flightSearchModal = document.getElementById("flightSearchModal");
  if (flightSearchModal) {
    flightSearchModal.addEventListener("click", (e) => {
      if (e.target === flightSearchModal) {
        closeFlightSearchModal();
      }
    });

    // Search on Enter key in inputs
    const flightSearchNumber = document.getElementById("flightSearchNumber");
    const flightSearchDate = document.getElementById("flightSearchDate");

    if (flightSearchNumber) {
      flightSearchNumber.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          searchFlights();
        }
      });
    }

    initializeCustomDatePicker();

    // Search button event listener
    const searchBtn = document.getElementById("flightSearchBtn");
    if (searchBtn) {
      searchBtn.addEventListener("click", searchFlights);
    }
  }

  // Flight Booking Modal handlers
  const closeFlightBookingModalBtn = document.getElementById(
    "closeFlightBookingModal"
  );
  if (closeFlightBookingModalBtn) {
    closeFlightBookingModalBtn.addEventListener(
      "click",
      closeFlightBookingModal
    );
  }

  const backToSearchBtn = document.getElementById("backToSearchBtn");
  if (backToSearchBtn) {
    backToSearchBtn.addEventListener("click", () => {
      closeFlightBookingModal();
      openFlightSearchModal();
    });
  }

  const saveFlightBtn = document.getElementById("saveFlightBtn");
  if (saveFlightBtn) {
    saveFlightBtn.addEventListener("click", saveFlight);
  }

  const flightBookingModal = document.getElementById("flightBookingModal");
  if (flightBookingModal) {
    flightBookingModal.addEventListener("click", (e) => {
      if (e.target === flightBookingModal) {
        closeFlightBookingModal();
      }
    });
  }

  // Event delegation for flight details buttons
  document.addEventListener("click", (e) => {
    const button = e.target.closest(".flight-details-btn");
    if (button) {
      const flightId = button.getAttribute("data-flight-id");
      if (flightId) {
        openFlightDetailsModal(flightId);
      }
    }
  });

  // Periodic flight status refresh (every 2 minutes)
  setInterval(async () => {
    console.log("[Auto Refresh] Starting periodic flight status refresh...");
    await refreshFlightStatuses();
  }, 2 * 60 * 1000); // 2 minutes
}

// Expose functions globally for inline handlers
window.selectFlightFromSearch = selectFlightFromSearch;

// ============================================================================
// QUIZ BUTTON HANDLER
// ============================================================================

/**
 * Initialize quiz button click handler
 */
function initializeQuizButton() {
  const quizCta = document.getElementById("quizCta");
  if (quizCta) {
    quizCta.addEventListener("click", () => {
      window.location.href = "/quiz";
    });
  }
}

// Initialize quiz button on page load
document.addEventListener("DOMContentLoaded", () => {
  initializeQuizButton();
});
