const express = require("express");
const { verifyToken } = require("../middleware/auth.middleware");
const { searchFlight, getFlightDetails } = require("../services/flight/AeroAPIService");
const {
  createFlight,
  getUserFlights,
  getFlightById,
  updateFlightStatus,
  updateFlightBookingDetails,
  deleteFlight,
} = require("../models/Flight.model");
const { ValidationError } = require("../utils/errorHandler");
const router = express.Router();

/**
 * POST /api/flights/search
 * Search for flights by flight number and date
 * Public endpoint (no auth required for search)
 */
router.post("/search", async (req, res, next) => {
  try {
    const { flightNumber, date } = req.body;

    // Validate input
    if (!flightNumber || typeof flightNumber !== "string" || flightNumber.trim() === "") {
      return res.status(400).json({
        error: "Flight number is required",
        code: "MISSING_FLIGHT_NUMBER",
      });
    }

    if (!date || typeof date !== "string" || date.trim() === "") {
      return res.status(400).json({
        error: "Date is required (format: YYYY-MM-DD)",
        code: "MISSING_DATE",
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "Invalid date format. Expected YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT",
      });
    }

    // Search flights using AeroAPI
    const flights = await searchFlight(flightNumber.trim(), date.trim());

    res.json({
      success: true,
      flights,
      count: flights.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/flights
 * Create a new flight with API data and user booking details
 * Requires authentication
 */
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { flightData, bookingDetails, tripId } = req.body;

    // Validate flightData
    if (!flightData || typeof flightData !== "object") {
      return res.status(400).json({
        error: "Flight data is required",
        code: "MISSING_FLIGHT_DATA",
      });
    }

    // Validate required flight data fields
    if (!flightData.airline || !flightData.flightNumber) {
      return res.status(400).json({
        error: "Flight data must include airline and flightNumber",
        code: "INVALID_FLIGHT_DATA",
      });
    }

    if (!flightData.scheduledDeparture || !flightData.scheduledArrival) {
      return res.status(400).json({
        error: "Flight data must include scheduledDeparture and scheduledArrival",
        code: "INVALID_FLIGHT_DATA",
      });
    }

    // bookingDetails is optional, but if provided, validate structure
    const booking = bookingDetails || {};

    // Create flight in database
    const flight = await createFlight(userId, flightData, booking, tripId || null);

    res.status(201).json({
      success: true,
      flight,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/flights
 * Get all flights for the authenticated user
 * Requires authentication
 */
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { tripId, status } = req.query;

    const options = {};
    if (tripId) options.tripId = tripId;
    if (status) options.status = status;

    const flights = await getUserFlights(userId, options);

    res.json({
      success: true,
      flights,
      count: flights.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/flights/:id
 * Get a specific flight by ID
 * Requires authentication (must be the flight owner)
 */
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const flight = await getFlightById(id, userId);

    res.json({
      success: true,
      flight,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/flights/:id/status
 * Update flight status and real-time data from API
 * Requires authentication (must be the flight owner)
 */
router.put("/:id/status", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const statusData = req.body;

    // Verify flight exists and belongs to user
    await getFlightById(id, userId);

    // Get flight details
    const flight = await getFlightById(id, userId);
    let updatedStatusData = { ...statusData };

    // Try to fetch latest data from API
    if (flight.apiFlightId || (flight.airlineCode && flight.flightNumber && flight.scheduledDeparture)) {
      try {
        let apiFlightData;

        // First try using the apiFlightId
        if (flight.apiFlightId) {
          try {
            apiFlightData = await getFlightDetails(flight.apiFlightId);
          } catch (apiError) {
            // Check if this is the "more than 10 days old" error
            // The error message contains the detail about "10 days ago" (may be truncated)
            const errorMessage = apiError.message || '';
            const isOldFlightError = apiError.statusCode === 400 && 
              (errorMessage.includes('10 days') || 
               errorMessage.includes('cannot be from more than 10') ||
               errorMessage.includes('more than 10 days') ||
               (errorMessage.includes('INVALID_ARGUMENT') && errorMessage.includes('fa_flight_id')));
            
            if (isOldFlightError) {
              // Flight is too old for the regular API endpoint
              // Check if flight should be marked as landed
              if (flight.status === "in_flight" && flight.scheduledArrival) {
                const scheduledArrival = new Date(flight.scheduledArrival);
                const now = new Date();
                const daysSinceScheduledArrival = (now - scheduledArrival) / (1000 * 60 * 60 * 24);
                
                if (daysSinceScheduledArrival > 10) {
                  console.log(`[Flight Update] Flight ${flight.airlineCode}${flight.flightNumber} is ${daysSinceScheduledArrival.toFixed(1)} days old and API requires historical endpoint. Marking as landed.`);
                  // Don't throw - we'll handle this in the outer catch block
                  throw { isOldFlight: true, daysOld: daysSinceScheduledArrival };
                }
              }
              // If not in_flight or no scheduled arrival, just skip API update
              throw { isOldFlight: true, skipUpdate: true };
            }
            
            // If apiFlightId lookup fails (404), try searching by flight number and date
            if (apiError.statusCode === 404) {
              console.log(`[Flight Update] apiFlightId expired for ${flight.airlineCode}${flight.flightNumber}, searching by flight number and date...`);

              // Extract date from scheduled departure
              const flightDate = new Date(flight.scheduledDeparture);
              const dateString = flightDate.toISOString().split('T')[0];
              const flightNumber = `${flight.airlineCode}${flight.flightNumber}`;

              // Search for the flight
              const searchResults = await searchFlight(flightNumber, dateString);

              if (searchResults && searchResults.length > 0) {
                // Use the first result
                apiFlightData = searchResults[0];
                console.log(`[Flight Update] Found flight via search, new status: ${apiFlightData.status}`);
              } else {
                throw new Error('Flight not found in search results');
              }
            } else {
              throw apiError;
            }
          }
        } else {
          // No apiFlightId, search by flight number and date
          const flightDate = new Date(flight.scheduledDeparture);
          const dateString = flightDate.toISOString().split('T')[0];
          const flightNumber = `${flight.airlineCode}${flight.flightNumber}`;

          const searchResults = await searchFlight(flightNumber, dateString);

          if (searchResults && searchResults.length > 0) {
            apiFlightData = searchResults[0];
          }
        }

        // If we got API data, merge it
        if (apiFlightData) {
          updatedStatusData = {
            status: apiFlightData.status,
            actualDeparture: apiFlightData.actualDeparture,
            estimatedArrival: apiFlightData.estimatedArrival,
            actualArrival: apiFlightData.actualArrival,
            departureDelay: apiFlightData.departureDelay,
            arrivalDelay: apiFlightData.arrivalDelay,
            progress: apiFlightData.progress,
            gate: apiFlightData.gate,
            gateArrival: apiFlightData.gateArrival,
            terminal: apiFlightData.terminal,
            terminalArrival: apiFlightData.terminalArrival,
            baggageClaim: apiFlightData.baggageClaim,
            aircraftType: apiFlightData.aircraftType,
            aircraftRegistration: apiFlightData.aircraftRegistration,
            ...statusData, // User-provided data overrides API data
          };
        } else {
          // API didn't return data - check if flight should be marked as landed
          // If flight is still in "in_flight" but is very old, mark it as landed
          if (flight.status === "in_flight" && flight.scheduledArrival) {
            const scheduledArrival = new Date(flight.scheduledArrival);
            const now = new Date();
            const hoursSinceScheduledArrival = (now - scheduledArrival) / (1000 * 60 * 60);
            
            // If more than 24 hours past scheduled arrival and still marked as in_flight, mark as landed
            if (hoursSinceScheduledArrival > 24) {
              console.log(`[Flight Update] Flight ${flight.airlineCode}${flight.flightNumber} is ${hoursSinceScheduledArrival.toFixed(1)} hours past scheduled arrival but still marked as in_flight. Marking as landed.`);
              updatedStatusData = {
                ...updatedStatusData,
                status: "landed",
                progress: 100,
                // Use scheduled arrival as actual arrival if we don't have one
                actualArrival: flight.actualArrival || flight.scheduledArrival,
              };
            }
          }
        }
      } catch (apiError) {
        // Check if this is the special "old flight" error we threw
        if (apiError.isOldFlight) {
          if (apiError.skipUpdate) {
            // Flight is old but not in a state that needs updating
            console.log(`[Flight Update] Flight ${flight.airlineCode}${flight.flightNumber} is too old for API but doesn't need status update.`);
            // Don't update anything, just return current flight
            updatedStatusData = statusData; // Use only user-provided data
          } else if (apiError.daysOld) {
            // Flight is old and still in_flight - mark as landed
            console.log(`[Flight Update] Flight ${flight.airlineCode}${flight.flightNumber} is ${apiError.daysOld.toFixed(1)} days old and still marked as in_flight. Marking as landed.`);
            updatedStatusData = {
              ...updatedStatusData,
              status: "landed",
              progress: 100,
              // Use scheduled arrival as actual arrival if we don't have one
              actualArrival: flight.actualArrival || flight.scheduledArrival,
            };
          }
        } else {
          // Regular API error - check if we should mark old in_flight flights as landed
          console.warn(`[Flight Update] Failed to fetch flight data from API for ${flight.airlineCode}${flight.flightNumber}:`, apiError.message || apiError);
          
          // Fallback: If flight is still in "in_flight" but is very old, mark it as landed
          if (flight.status === "in_flight" && flight.scheduledArrival) {
            const scheduledArrival = new Date(flight.scheduledArrival);
            const now = new Date();
            const daysSinceScheduledArrival = (now - scheduledArrival) / (1000 * 60 * 60 * 24);
            
            // If more than 10 days past scheduled arrival and still marked as in_flight, mark as landed
            if (daysSinceScheduledArrival > 10) {
              console.log(`[Flight Update] API failed for ${flight.airlineCode}${flight.flightNumber}, but flight is ${daysSinceScheduledArrival.toFixed(1)} days past scheduled arrival. Marking as landed.`);
              updatedStatusData = {
                ...updatedStatusData,
                status: "landed",
                progress: 100,
                // Use scheduled arrival as actual arrival if we don't have one
                actualArrival: flight.actualArrival || flight.scheduledArrival,
              };
            }
          }
        }
      }
    }

    const updatedFlight = await updateFlightStatus(id, updatedStatusData);

    res.json({
      success: true,
      flight: updatedFlight,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/flights/:id/booking
 * Update user booking details for a flight
 * Requires authentication (must be the flight owner)
 */
router.put("/:id/booking", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const bookingDetails = req.body;

    if (!bookingDetails || typeof bookingDetails !== "object") {
      return res.status(400).json({
        error: "Booking details are required",
        code: "MISSING_BOOKING_DETAILS",
      });
    }

    const updatedFlight = await updateFlightBookingDetails(id, userId, bookingDetails);

    res.json({
      success: true,
      flight: updatedFlight,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/flights/:id
 * Delete a flight
 * Requires authentication (must be the flight owner)
 */
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await deleteFlight(id, userId);

    res.json({
      success: true,
      message: "Flight deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

