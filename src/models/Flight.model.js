const prisma = require("./prismaClient");
const {
  ValidationError,
  NotFoundError,
  handlePrismaError,
  withErrorHandling,
} = require("../utils/errorHandler");
const { StringValidator } = require("../utils/validators");

/**
 * Flight repository - Handles all flight data operations
 * Follows SOLID principles with centralized error handling
 */

/**
 * Creates a new flight record with API data and user booking details
 * @param {string} userId - User ID who owns the flight
 * @param {Object} flightData - Flight data from AeroAPI (formatted)
 * @param {Object} bookingDetails - User-provided booking details
 * @param {string|null} tripId - Optional trip ID to associate flight with
 * @returns {Promise<Object>} Created flight object
 * @throws {AppError} If validation fails or creation fails
 */
module.exports.createFlight = withErrorHandling(
  async function createFlight(
    userId,
    flightData,
    bookingDetails = {},
    tripId = null
  ) {
    // Validate required fields
    if (!userId) {
      throw ValidationError.missingRequiredField("userId");
    }

    if (!flightData || !flightData.airline || !flightData.flightNumber) {
      throw ValidationError.invalidInput(
        "Flight data must include airline and flightNumber"
      );
    }

    if (!flightData.scheduledDeparture || !flightData.scheduledArrival) {
      throw ValidationError.invalidInput(
        "Flight data must include scheduledDeparture and scheduledArrival"
      );
    }

    // Prepare flight data for database
    const flightRecord = {
      userId,
      tripId: tripId || null,

      // API Flight Data
      airline: flightData.airline,
      airlineCode: flightData.airlineCode || "",
      flightNumber: flightData.flightNumber,
      originCity: flightData.originCity || "",
      originAirport: flightData.originAirport || "",
      originAirportFull: flightData.originAirportFull || null,
      originTimezone: flightData.originTimezone || null,
      destinationCity: flightData.destinationCity || "",
      destinationAirport: flightData.destinationAirport || "",
      destinationAirportFull: flightData.destinationAirportFull || null,
      destinationTimezone: flightData.destinationTimezone || null,

      // Times
      scheduledDeparture: flightData.scheduledDeparture,
      actualDeparture: flightData.actualDeparture || null,
      scheduledArrival: flightData.scheduledArrival,
      estimatedArrival: flightData.estimatedArrival || null,
      actualArrival: flightData.actualArrival || null,

      // Status
      status: flightData.status || "scheduled",
      departureDelay: flightData.departureDelay || null,
      arrivalDelay: flightData.arrivalDelay || null,
      progress: flightData.progress || null,

      // Gate & Terminal Info
      gate: flightData.gate || bookingDetails.gate || null,
      gateArrival: flightData.gateArrival || null,
      terminal: flightData.terminal || null,
      terminalArrival: flightData.terminalArrival || null,
      baggageClaim: flightData.baggageClaim || null,

      // Aircraft Info
      aircraftType: flightData.aircraftType || null,
      aircraftRegistration: flightData.aircraftRegistration || null,

      // User Booking Details
      bookingNumber: bookingDetails.bookingNumber || null,
      confirmationCode: bookingDetails.confirmationCode || null,
      ticketNumber: bookingDetails.ticketNumber || null,
      seatNumber: bookingDetails.seatNumber || null,
      seatClass: bookingDetails.seatClass || null,
      seatAmenities: bookingDetails.seatAmenities || null,

      // API Metadata
      apiFlightId: flightData.apiFlightId || null,
      apiLastSynced: new Date(),
    };

    const flight = await prisma.flight.create({
      data: flightRecord,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trip: {
          select: {
            id: true,
            tripName: true,
          },
        },
      },
    });

    return flight;
  },
  { operation: "create flight", entity: "flight" }
);

/**
 * Gets all flights for a user
 * @param {string} userId - User ID
 * @param {Object} options - Optional filters
 * @param {string|null} options.tripId - Filter by trip ID
 * @param {string|null} options.status - Filter by status
 * @returns {Promise<Array>} Array of flight objects
 * @throws {AppError} If query fails
 */
module.exports.getUserFlights = withErrorHandling(
  async function getUserFlights(userId, options = {}) {
    if (!userId) {
      throw ValidationError.missingRequiredField("userId");
    }

    const where = {
      userId,
    };

    if (options.tripId) {
      where.tripId = options.tripId;
    }

    if (options.status) {
      where.status = options.status;
    }

    const flights = await prisma.flight.findMany({
      where,
      orderBy: {
        scheduledDeparture: "desc",
      },
      include: {
        trip: {
          select: {
            id: true,
            tripName: true,
          },
        },
      },
    });

    return flights;
  },
  { operation: "get user flights", entity: "flight" }
);

/**
 * Gets a single flight by ID
 * @param {string} flightId - Flight ID
 * @param {string|null} userId - Optional user ID for authorization check
 * @returns {Promise<Object>} Flight object
 * @throws {AppError} If flight not found or unauthorized
 */
module.exports.getFlightById = withErrorHandling(
  async function getFlightById(flightId, userId = null) {
    if (!flightId) {
      throw ValidationError.missingRequiredField("flightId");
    }

    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trip: {
          select: {
            id: true,
            tripName: true,
          },
        },
      },
    });

    if (!flight) {
      throw NotFoundError.resource("flight");
    }

    // If userId provided, verify ownership
    if (userId && flight.userId !== userId) {
      throw NotFoundError.resource("flight");
    }

    return flight;
  },
  { operation: "get flight by id", entity: "flight" }
);

/**
 * Updates flight status and real-time data from API
 * @param {string} flightId - Flight ID
 * @param {Object} statusData - Updated flight status data from API
 * @returns {Promise<Object>} Updated flight object
 * @throws {AppError} If flight not found or update fails
 */
module.exports.updateFlightStatus = withErrorHandling(
  async function updateFlightStatus(flightId, statusData) {
    if (!flightId) {
      throw ValidationError.missingRequiredField("flightId");
    }

    // Check if flight exists
    const existingFlight = await prisma.flight.findUnique({
      where: { id: flightId },
    });

    if (!existingFlight) {
      throw NotFoundError.resourceNotFound("flight", flightId);
    }

    // Prepare update data
    const updateData = {
      apiLastSynced: new Date(),
    };

    // Update times if provided
    if (statusData.actualDeparture !== undefined) {
      updateData.actualDeparture = statusData.actualDeparture;
    }
    if (statusData.estimatedArrival !== undefined) {
      updateData.estimatedArrival = statusData.estimatedArrival;
    }
    if (statusData.actualArrival !== undefined) {
      updateData.actualArrival = statusData.actualArrival;
    }

    // Update status if provided
    if (statusData.status) {
      updateData.status = statusData.status;
    }

    // Update delays if provided
    if (statusData.departureDelay !== undefined) {
      updateData.departureDelay = statusData.departureDelay;
    }
    if (statusData.arrivalDelay !== undefined) {
      updateData.arrivalDelay = statusData.arrivalDelay;
    }

    // Update progress if provided
    if (statusData.progress !== undefined) {
      updateData.progress = statusData.progress;
    }

    // Update gate and terminal info if provided
    if (statusData.gate !== undefined) {
      updateData.gate = statusData.gate;
    }
    if (statusData.gateArrival !== undefined) {
      updateData.gateArrival = statusData.gateArrival;
    }
    if (statusData.terminal !== undefined) {
      updateData.terminal = statusData.terminal;
    }
    if (statusData.terminalArrival !== undefined) {
      updateData.terminalArrival = statusData.terminalArrival;
    }
    if (statusData.baggageClaim !== undefined) {
      updateData.baggageClaim = statusData.baggageClaim;
    }

    // Update aircraft info if provided
    if (statusData.aircraftType !== undefined) {
      updateData.aircraftType = statusData.aircraftType;
    }
    if (statusData.aircraftRegistration !== undefined) {
      updateData.aircraftRegistration = statusData.aircraftRegistration;
    }

    const updatedFlight = await prisma.flight.update({
      where: { id: flightId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trip: {
          select: {
            id: true,
            tripName: true,
          },
        },
      },
    });

    return updatedFlight;
  },
  { operation: "update flight status", entity: "flight" }
);

/**
 * Updates user booking details for a flight
 * @param {string} flightId - Flight ID
 * @param {string} userId - User ID (for authorization)
 * @param {Object} bookingDetails - Updated booking details
 * @returns {Promise<Object>} Updated flight object
 * @throws {AppError} If flight not found or unauthorized
 */
module.exports.updateFlightBookingDetails = withErrorHandling(
  async function updateFlightBookingDetails(flightId, userId, bookingDetails) {
    if (!flightId) {
      throw ValidationError.missingRequiredField("flightId");
    }
    if (!userId) {
      throw ValidationError.missingRequiredField("userId");
    }

    // Check if flight exists and belongs to user
    const existingFlight = await prisma.flight.findUnique({
      where: { id: flightId },
    });

    if (!existingFlight) {
      throw NotFoundError.resource("flight");
    }

    if (existingFlight.userId !== userId) {
      throw NotFoundError.resource("flight");
    }

    // Prepare update data
    const updateData = {};

    if (bookingDetails.bookingNumber !== undefined) {
      updateData.bookingNumber = bookingDetails.bookingNumber || null;
    }
    if (bookingDetails.confirmationCode !== undefined) {
      updateData.confirmationCode = bookingDetails.confirmationCode || null;
    }
    if (bookingDetails.ticketNumber !== undefined) {
      updateData.ticketNumber = bookingDetails.ticketNumber || null;
    }
    if (bookingDetails.seatNumber !== undefined) {
      updateData.seatNumber = bookingDetails.seatNumber || null;
    }
    if (bookingDetails.seatClass !== undefined) {
      updateData.seatClass = bookingDetails.seatClass || null;
    }
    if (bookingDetails.seatAmenities !== undefined) {
      updateData.seatAmenities = bookingDetails.seatAmenities || null;
    }
    if (bookingDetails.gate !== undefined) {
      updateData.gate = bookingDetails.gate || null;
    }
    if (bookingDetails.gateArrival !== undefined) {
      updateData.gateArrival = bookingDetails.gateArrival || null;
    }
    if (bookingDetails.terminal !== undefined) {
      updateData.terminal = bookingDetails.terminal || null;
    }
    if (bookingDetails.terminalArrival !== undefined) {
      updateData.terminalArrival = bookingDetails.terminalArrival || null;
    }
    if (bookingDetails.baggageClaim !== undefined) {
      updateData.baggageClaim = bookingDetails.baggageClaim || null;
    }

    const updatedFlight = await prisma.flight.update({
      where: { id: flightId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trip: {
          select: {
            id: true,
            tripName: true,
          },
        },
      },
    });

    return updatedFlight;
  },
  { operation: "update flight booking details", entity: "flight" }
);

/**
 * Deletes a flight
 * @param {string} flightId - Flight ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} Deleted flight object
 * @throws {AppError} If flight not found or unauthorized
 */
module.exports.deleteFlight = withErrorHandling(
  async function deleteFlight(flightId, userId) {
    if (!flightId) {
      throw ValidationError.missingRequiredField("flightId");
    }
    if (!userId) {
      throw ValidationError.missingRequiredField("userId");
    }

    // Check if flight exists and belongs to user
    const existingFlight = await prisma.flight.findUnique({
      where: { id: flightId },
    });

    if (!existingFlight) {
      throw NotFoundError.resource("flight");
    }

    if (existingFlight.userId !== userId) {
      throw NotFoundError.resource("flight");
    }

    const deletedFlight = await prisma.flight.delete({
      where: { id: flightId },
    });

    return deletedFlight;
  },
  { operation: "delete flight", entity: "flight" }
);
