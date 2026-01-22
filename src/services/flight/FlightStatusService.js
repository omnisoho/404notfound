/**
 * Flight Status Service
 *
 * Handles automatic flight status updates and polling.
 * Follows Single Responsibility Principle: Only responsible for flight status synchronization.
 *
 * Dependencies:
 * - AeroAPIService: For fetching flight data
 * - Flight.model: For updating flight records
 */

const { getFlightDetails } = require("./AeroAPIService");
const { updateFlightStatus, getFlightById } = require("../../models/Flight.model");
const { AppError } = require("../../utils/errorHandler");

/**
 * Determines if a flight needs status updates based on its current state
 * @param {Object} flight - Flight object from database
 * @returns {boolean} True if flight needs updates
 */
function shouldUpdateFlightStatus(flight) {
  // Don't update if flight has already landed and we have actual arrival time
  if (flight.status === "landed" && flight.actualArrival) {
    return false;
  }

  // Don't update if flight was cancelled
  if (flight.status === "cancelled") {
    return false;
  }

  // IMPORTANT: Check active states FIRST, even if flight is old
  // This ensures flights stuck in "in_flight" status get updated to "landed"
  const activeStatuses = ["scheduled", "boarding", "in_flight", "delayed"];
  if (activeStatuses.includes(flight.status)) {
    // Always update flights in active states, regardless of age
    // This fixes the issue where flights that landed months ago are still marked as "in_flight"
    return true;
  }

  // Don't update if flight is too old (more than 24 hours past scheduled arrival)
  // Only check this for flights NOT in active states
  if (flight.scheduledArrival) {
    const scheduledArrival = new Date(flight.scheduledArrival);
    const now = new Date();
    const hoursSinceScheduledArrival = (now - scheduledArrival) / (1000 * 60 * 60);

    if (hoursSinceScheduledArrival > 24) {
      return false;
    }
  }

  // Update if flight is within 2 hours of scheduled departure or arrival
  const now = new Date();
  if (flight.scheduledDeparture) {
    const scheduledDeparture = new Date(flight.scheduledDeparture);
    const hoursUntilDeparture = (scheduledDeparture - now) / (1000 * 60 * 60);
    if (hoursUntilDeparture >= -2 && hoursUntilDeparture <= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Updates a single flight's status from AeroAPI
 * @param {string} flightId - Flight ID from database
 * @returns {Promise<Object|null>} Updated flight object or null if update not needed
 */
async function updateSingleFlightStatus(flightId) {
  try {
    // Get current flight data from database
    const flight = await getFlightById(flightId);

    if (!flight) {
      console.warn(`[FlightStatusService] Flight ${flightId} not found`);
      return null;
    }

    // Check if flight needs update
    if (!shouldUpdateFlightStatus(flight)) {
      console.log(`[FlightStatusService] Flight ${flightId} (${flight.airlineCode}${flight.flightNumber}) does not need update (status: ${flight.status})`);
      return flight;
    }

    // Check if we have an API flight ID
    if (!flight.apiFlightId) {
      console.warn(`[FlightStatusService] Flight ${flightId} has no apiFlightId, cannot update from API`);
      return flight;
    }

    console.log(`[FlightStatusService] Updating flight ${flightId} (${flight.airlineCode}${flight.flightNumber}) from API...`);

    // Fetch latest data from AeroAPI
    const apiFlightData = await getFlightDetails(flight.apiFlightId);

    // Prepare status update data
    const statusUpdate = {
      status: apiFlightData.status,
      actualDeparture: apiFlightData.actualDeparture,
      estimatedArrival: apiFlightData.estimatedArrival,
      actualArrival: apiFlightData.actualArrival,
      departureDelay: apiFlightData.departureDelay,
      arrivalDelay: apiFlightData.arrivalDelay,
      progress: apiFlightData.progress,
      gate: apiFlightData.gate || flight.gate, // Keep user's gate if API doesn't provide
      gateArrival: apiFlightData.gateArrival,
      terminal: apiFlightData.terminal,
      terminalArrival: apiFlightData.terminalArrival,
      baggageClaim: apiFlightData.baggageClaim,
      aircraftType: apiFlightData.aircraftType,
      aircraftRegistration: apiFlightData.aircraftRegistration,
    };

    // Update flight in database
    const updatedFlight = await updateFlightStatus(flightId, statusUpdate);

    console.log(`[FlightStatusService] Flight ${flightId} updated successfully. Status: ${updatedFlight.status}`);

    return updatedFlight;
  } catch (error) {
    console.error(`[FlightStatusService] Error updating flight ${flightId}:`, error.message);

    // Don't throw - we want to continue updating other flights even if one fails
    return null;
  }
}

/**
 * Updates all active flights for a user
 * @param {string} userId - User ID
 * @param {Array<Object>} flights - Array of flight objects
 * @returns {Promise<Array<Object>>} Array of updated flights
 */
async function updateUserFlights(userId, flights) {
  if (!flights || flights.length === 0) {
    return [];
  }

  console.log(`[FlightStatusService] Updating ${flights.length} flights for user ${userId}...`);

  // Update all flights in parallel
  const updatePromises = flights.map(flight => updateSingleFlightStatus(flight.id));
  const results = await Promise.all(updatePromises);

  // Filter out null results (failed updates)
  const updatedFlights = results.filter(f => f !== null);

  console.log(`[FlightStatusService] Successfully updated ${updatedFlights.length}/${flights.length} flights`);

  return updatedFlights;
}

/**
 * Creates a polling interval for flight status updates
 * @param {string} userId - User ID
 * @param {Function} onUpdate - Callback function called with updated flights
 * @param {number} intervalMs - Polling interval in milliseconds (default: 60000 = 1 minute)
 * @returns {Function} Function to stop polling
 */
function startFlightStatusPolling(userId, onUpdate, intervalMs = 60000) {
  let intervalId = null;

  const poll = async () => {
    try {
      const { getUserFlights } = require("../../models/Flight.model");
      const flights = await getUserFlights(userId);
      const updatedFlights = await updateUserFlights(userId, flights);

      if (onUpdate && typeof onUpdate === "function") {
        onUpdate(updatedFlights);
      }
    } catch (error) {
      console.error("[FlightStatusService] Polling error:", error.message);
    }
  };

  // Start polling
  intervalId = setInterval(poll, intervalMs);

  // Initial update
  poll();

  // Return stop function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      console.log("[FlightStatusService] Stopped polling for user", userId);
    }
  };
}

module.exports = {
  shouldUpdateFlightStatus,
  updateSingleFlightStatus,
  updateUserFlights,
  startFlightStatusPolling,
};
