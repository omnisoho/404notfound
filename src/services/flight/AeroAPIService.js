/**
 * AeroAPI Service
 *
 * Handles all interactions with FlightAware AeroAPI.
 * Follows Single Responsibility Principle: Only responsible for AeroAPI communication.
 *
 * API Documentation: https://www.flightaware.com/commercial/aeroapi/
 * Base URL: https://aeroapi.flightaware.com/aeroapi/
 *
 * Environment Variables Required:
 * - AEROAPI_API_KEY
 */

const https = require("https");
const { AppError } = require("../../utils/errorHandler");

const AEROAPI_BASE_URL = "aeroapi.flightaware.com";
const AEROAPI_PATH_PREFIX = "/aeroapi";

/**
 * Makes an HTTPS request to AeroAPI
 * @param {string} path - API endpoint path (e.g., "/flights/BA416")
 * @param {Object} queryParams - Query parameters as key-value pairs
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {AppError} If API request fails
 */
function makeAeroAPIRequest(path, queryParams = {}) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.AEROAPI_API_KEY;

    if (!apiKey) {
      reject(
        new AppError(
          "AeroAPI API key is not configured. Please set AEROAPI_API_KEY in your environment.",
          500,
          "AEROAPI_CONFIG_ERROR"
        )
      );
      return;
    }

    // Build query string
    const queryString = Object.keys(queryParams)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`
      )
      .join("&");

    const fullPath = queryString
      ? `${AEROAPI_PATH_PREFIX}${path}?${queryString}`
      : `${AEROAPI_PATH_PREFIX}${path}`;

    const options = {
      hostname: AEROAPI_BASE_URL,
      path: fullPath,
      method: "GET",
      headers: {
        "x-apikey": apiKey,
        Accept: "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(
              new AppError(
                "Failed to parse AeroAPI response",
                500,
                "AEROAPI_PARSE_ERROR"
              )
            );
          }
        } else {
          // Handle API errors
          let errorMessage = "AeroAPI request failed";
          let errorDetails = "";
          try {
            const errorData = JSON.parse(data);
            errorMessage = errorData.error || errorData.message || errorMessage;
            errorDetails = JSON.stringify(errorData);
          } catch (e) {
            // If we can't parse error, use raw response
            errorDetails = data;
          }

          // Log full error for debugging
          console.error("AeroAPI Error Response:", {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            body: errorDetails,
            path: fullPath,
          });

          reject(
            new AppError(
              `${errorMessage}${
                errorDetails ? `: ${errorDetails.substring(0, 100)}` : ""
              }`,
              res.statusCode || 500,
              "AEROAPI_REQUEST_ERROR"
            )
          );
        }
      });
    });

    req.on("error", (error) => {
      reject(
        new AppError(
          `AeroAPI network error: ${error.message}`,
          500,
          "AEROAPI_NETWORK_ERROR"
        )
      );
    });

    req.end();
  });
}

/**
 * Maps AeroAPI status string to our FlightStatus enum
 * @param {string} apiStatus - Status from AeroAPI
 * @returns {string} Our FlightStatus enum value (lowercase with underscores)
 */
function mapFlightStatus(apiStatus) {
  const statusMap = {
    Scheduled: "scheduled",
    Boarding: "boarding",
    "In Flight": "in_flight",
    Landed: "landed",
    Cancelled: "cancelled",
    Delayed: "delayed",
    Departed: "in_flight",
    Arrived: "landed",
  };

  return statusMap[apiStatus] || "scheduled";
}

/**
 * Parses ISO 8601 date string from AeroAPI
 * @param {string} dateString - ISO 8601 date string
 * @returns {Date} Parsed Date object
 */
function parseAPIDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString);
}

/**
 * Calculates delay in minutes between two dates
 * @param {Date} scheduled - Scheduled time
 * @param {Date} actual - Actual time
 * @returns {number|null} Delay in minutes, or null if either date is missing
 */
function calculateDelay(scheduled, actual) {
  if (!scheduled || !actual) return null;
  return Math.round((actual - scheduled) / (1000 * 60));
}

/**
 * Formats flight data from AeroAPI response to our application format
 * @param {Object} apiFlight - Flight data from AeroAPI
 * @returns {Object} Formatted flight data
 */
const AIRLINE_NAMES = {
  // IATA codes
  SQ: "Singapore Airlines",
  BA: "British Airways",
  AA: "American Airlines",
  DL: "Delta Air Lines",
  UA: "United Airlines",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM",
  EK: "Emirates",
  QR: "Qatar Airways",
  CX: "Cathay Pacific",
  JL: "Japan Airlines",
  NH: "All Nippon Airways",
  QF: "Qantas",
  TG: "Thai Airways",
  MH: "Malaysia Airlines",
  GA: "Garuda Indonesia",
  PR: "Philippine Airlines",
  VN: "Vietnam Airlines",
  CA: "Air China",
  MU: "China Eastern",
  CZ: "China Southern",
  KE: "Korean Air",
  OZ: "Asiana Airlines",
  AI: "Air India",
  VS: "Virgin Atlantic",
  IB: "Iberia",
  LX: "Swiss International",
  OS: "Austrian Airlines",
  SN: "Brussels Airlines",
  TP: "TAP Air Portugal",
  TK: "Turkish Airlines",
  SV: "Saudia",
  EY: "Etihad Airways",
  AC: "Air Canada",
  WS: "WestJet",
  NZ: "Air New Zealand",
  VA: "Virgin Australia",
  FJ: "Fiji Airways",
  PG: "Bangkok Airways",
  TR: "Scoot",
  JQ: "Jetstar",
  AK: "AirAsia",
  FD: "Thai AirAsia",
  Z2: "Philippines AirAsia",
  QZ: "Indonesia AirAsia",
  D7: "AirAsia X",
  KU: "Kuwait Airways",

  // ICAO codes (used by AeroAPI)
  SIA: "Singapore Airlines",
  BAW: "British Airways",
  AAL: "American Airlines",
  DAL: "Delta Air Lines",
  UAL: "United Airlines",
  DLH: "Lufthansa",
  AFR: "Air France",
  KLM: "KLM",
  UAE: "Emirates",
  QTR: "Qatar Airways",
  CPA: "Cathay Pacific",
  JAL: "Japan Airlines",
  ANA: "All Nippon Airways",
  QFA: "Qantas",
  THA: "Thai Airways",
  MAS: "Malaysia Airlines",
  GIA: "Garuda Indonesia",
  PAL: "Philippine Airlines",
  HVN: "Vietnam Airlines",
  CCA: "Air China",
  CES: "China Eastern",
  CSN: "China Southern",
  KAL: "Korean Air",
  AAR: "Asiana Airlines",
  AIC: "Air India",
  VIR: "Virgin Atlantic",
  IBE: "Iberia",
  SWR: "Swiss International",
  AUA: "Austrian Airlines",
  BEL: "Brussels Airlines",
  TAP: "TAP Air Portugal",
  THY: "Turkish Airlines",
  SVA: "Saudia",
  ETD: "Etihad Airways",
  ACA: "Air Canada",
  WJA: "WestJet",
  ANZ: "Air New Zealand",
  VOZ: "Virgin Australia",
  FJI: "Fiji Airways",
  BKP: "Bangkok Airways",
  TGW: "Scoot",
  JST: "Jetstar",
  AXM: "AirAsia",
  KAC: "Kuwait Airways",
};

function getAirlineName(airlineCode, airlineName) {
  // If we have a valid airline name from API that's not "Unknown", use it
  if (airlineName && airlineName !== "Unknown" && airlineName.trim() !== "") {
    return airlineName;
  }
  // Try to get name from our mapping using the airline code
  if (airlineCode && AIRLINE_NAMES[airlineCode]) {
    return AIRLINE_NAMES[airlineCode];
  }
  // If airline code exists but not in our mapping, return it as fallback
  if (airlineCode && airlineCode.trim() !== "") {
    return airlineCode;
  }
  // Last resort
  return airlineName || "Unknown Airline";
}

function formatFlightData(apiFlight) {
  const scheduledDeparture = parseAPIDate(apiFlight.scheduled_out);
  const actualDeparture = parseAPIDate(apiFlight.actual_out);
  const scheduledArrival = parseAPIDate(apiFlight.scheduled_in);
  const estimatedArrival = parseAPIDate(apiFlight.estimated_in);
  const actualArrival = parseAPIDate(apiFlight.actual_in);

  // AeroAPI uses different field names - try all possibilities
  // Fields: operator_iata, operator_icao, airline_iata, airline_icao, operator, airline
  const airlineIATA = apiFlight.operator_iata || apiFlight.airline_iata || "";
  const airlineICAO =
    apiFlight.operator_icao ||
    apiFlight.airline_icao ||
    apiFlight.operator ||
    "";
  const airlineFromAPI = apiFlight.operator_name || apiFlight.airline || "";

  // Prefer IATA, but use ICAO if IATA not available
  const airlineCode = airlineIATA || airlineICAO;
  const airlineName = getAirlineName(airlineCode, airlineFromAPI);

  // Debug logging
  console.log(`[AeroAPI] Formatting flight data:`, {
    ident: apiFlight.ident,
    operator: apiFlight.operator,
    operator_iata: apiFlight.operator_iata,
    operator_icao: apiFlight.operator_icao,
    operator_name: apiFlight.operator_name,
    airline_iata: apiFlight.airline_iata,
    airline_icao: apiFlight.airline_icao,
    airline: apiFlight.airline,
    extracted_airlineIATA: airlineIATA,
    extracted_airlineICAO: airlineICAO,
    extracted_airlineFromAPI: airlineFromAPI,
    computed_airlineCode: airlineCode,
    computed_airlineName: airlineName,
    mappingFound: AIRLINE_NAMES[airlineCode] || "NOT_FOUND",
  });

  // Extract flight number from ident (e.g., "SIA638" -> "638", "SQ638" -> "638")
  const ident = apiFlight.ident_iata || apiFlight.ident || "";
  const flightNumberMatch = ident.match(/\d+$/); // Extract trailing numbers
  const flightNumberOnly = flightNumberMatch ? flightNumberMatch[0] : "";

  // Intelligent status detection
  // Sometimes AeroAPI returns "Scheduled" even when the flight has landed
  // We need to infer the actual status from the flight data
  let flightStatus = mapFlightStatus(apiFlight.status);
  const progress = apiFlight.progress_percent || 0;

  // Override status based on actual flight state
  if (actualArrival) {
    // If we have actual arrival time, flight has definitely landed
    flightStatus = "landed";
  } else if (progress >= 100) {
    // If progress is 100%, flight should have landed
    flightStatus = "landed";
  } else if (actualDeparture && progress > 0) {
    // If departed and in progress, it's in flight
    flightStatus = "in_flight";
  } else if (actualDeparture) {
    // If departed but no progress, might be recently departed
    flightStatus = "in_flight";
  }

  console.log(
    `[AeroAPI] Status determination: API="${
      apiFlight.status
    }", progress=${progress}%, actualDeparture=${!!actualDeparture}, actualArrival=${!!actualArrival}, final="${flightStatus}"`
  );

  return {
    // Basic Flight Info
    airline: airlineName,
    airlineCode: airlineCode,
    flightNumber: flightNumberOnly,
    fullFlightNumber: airlineCode + flightNumberOnly,
    originCity: apiFlight.origin?.city || "",
    originAirport: apiFlight.origin?.code || "",
    originAirportFull: apiFlight.origin?.name || null,
    originTimezone: apiFlight.origin?.timezone || null,
    destinationCity: apiFlight.destination?.city || "",
    destinationAirport: apiFlight.destination?.code || "",
    destinationAirportFull: apiFlight.destination?.name || null,
    destinationTimezone: apiFlight.destination?.timezone || null,

    // Times
    scheduledDeparture,
    actualDeparture,
    scheduledArrival,
    estimatedArrival,
    actualArrival,

    // Status
    status: flightStatus,
    departureDelay: calculateDelay(scheduledDeparture, actualDeparture),
    arrivalDelay: calculateDelay(
      scheduledArrival,
      actualArrival || estimatedArrival
    ),
    progress: progress,

    // Gate & Terminal Info
    gate: apiFlight.gate_origin || null,
    gateArrival: apiFlight.gate_destination || null,
    terminal: apiFlight.terminal_origin || null,
    terminalArrival: apiFlight.terminal_destination || null,
    baggageClaim: apiFlight.baggage_claim || null,

    // Aircraft Info
    aircraftType: apiFlight.aircraft_type || null,
    aircraftRegistration: apiFlight.registration || null,
    aircraftAge: apiFlight.aircraft_age || apiFlight.age || null,
    seatConfiguration:
      apiFlight.seat_configuration || apiFlight.seat_config || null,

    // API Metadata
    apiFlightId: apiFlight.fa_flight_id || null,
  };
}

/**
 * Searches for flights by flight number and date
 * @param {string} flightNumber - Flight identifier (e.g., "BA416" or "BA 416")
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of matching flights
 * @throws {AppError} If search fails
 */
async function searchFlight(flightNumber, date) {
  try {
    // Normalize flight number (remove spaces, ensure uppercase)
    const normalizedFlightNumber = flightNumber
      .replace(/\s+/g, "")
      .toUpperCase();

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(
        "Invalid date format. Expected YYYY-MM-DD",
        400,
        "INVALID_DATE_FORMAT"
      );
    }

    // Extract airline code from flight number (first 2-3 letters)
    const airlineMatch = normalizedFlightNumber.match(/^([A-Z]{2,3})/);
    const airlineCode = airlineMatch ? airlineMatch[1] : null;

    // Calculate end date (next day) to limit results to only the specified date
    const searchDate = new Date(date);
    const endDate = new Date(searchDate);
    endDate.setDate(endDate.getDate() + 1);
    const endDateString = endDate.toISOString().split("T")[0];

    // Check if date is beyond 48 hours (AeroAPI's typical forward window)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysAhead = Math.floor((searchDate - today) / (1000 * 60 * 60 * 24));
    const isBeyond48Hours = daysAhead > 2;

    // AeroAPI expects date in YYYY-MM-DD format for 'start' and 'end' parameters
    console.log(
      `[AeroAPI] Searching for flight ${normalizedFlightNumber} on date ${date} (${daysAhead} days ahead)`
    );

    let response;
    let error = null;

    // Try primary endpoint first (/flights/{ident})
    try {
      response = await makeAeroAPIRequest(
        `/flights/${normalizedFlightNumber}`,
        {
          start: date,
          end: endDateString,
        }
      );
      console.log(
        `[AeroAPI] Response received from /flights endpoint:`,
        JSON.stringify(response).substring(0, 200)
      );
    } catch (primaryError) {
      error = primaryError;

      // If date is beyond 48 hours and we have airline code, try alternative endpoint
      if (isBeyond48Hours && airlineCode) {
        console.log(
          `[AeroAPI] Primary endpoint failed, trying /operators endpoint for dates beyond 48h`
        );
        try {
          // Try /operators/{airline}/flights endpoint which may have different time limits
          response = await makeAeroAPIRequest(
            `/operators/${airlineCode}/flights`,
            {
              start: date,
              end: endDateString,
              ident: normalizedFlightNumber, // Filter by specific flight number
            }
          );
          console.log(
            `[AeroAPI] Response received from /operators endpoint:`,
            JSON.stringify(response).substring(0, 200)
          );
          error = null; // Clear error if this works
        } catch (operatorError) {
          // If both fail, throw a helpful error
          throw new AppError(
            `Unable to search for flights ${daysAhead} days ahead. AeroAPI limits forward searches to 24-48 hours. For dates beyond this, please try searching closer to your travel date, or consider upgrading to a premium AeroAPI plan that may support extended date ranges.`,
            400,
            "DATE_RANGE_EXCEEDED"
          );
        }
      } else {
        // Re-throw the original error if we can't try alternative
        throw primaryError;
      }
    }

    // AeroAPI can return different response structures
    // Check if it's an array of flights
    if (Array.isArray(response)) {
      if (response.length === 0) {
        return [];
      }
      // Filter flights to only include those scheduled for the specific date
      const filteredFlights = response.filter((flight) => {
        if (!flight.scheduled_out) return false;
        const flightDate = new Date(flight.scheduled_out)
          .toISOString()
          .split("T")[0];
        return flightDate === date;
      });
      return filteredFlights.map(formatFlightData);
    }

    // Check if it's a single flight object with fa_flight_id
    if (response && response.fa_flight_id) {
      // Verify the flight is for the requested date
      if (response.scheduled_out) {
        const flightDate = new Date(response.scheduled_out)
          .toISOString()
          .split("T")[0];
        if (flightDate === date) {
          return [formatFlightData(response)];
        }
      }
      return [];
    }

    // Check if response has a 'flights' property (some API versions)
    if (response && Array.isArray(response.flights)) {
      const filteredFlights = response.flights.filter((flight) => {
        if (!flight.scheduled_out) return false;
        const flightDate = new Date(flight.scheduled_out)
          .toISOString()
          .split("T")[0];
        return flightDate === date;
      });
      return filteredFlights.map(formatFlightData);
    }

    // If response structure is unexpected, log it and return empty
    console.warn("Unexpected AeroAPI response structure:", response);
    return [];
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to search flights: ${error.message}`,
      500,
      "FLIGHT_SEARCH_ERROR"
    );
  }
}

/**
 * Gets detailed flight information by FlightAware flight ID
 * @param {string} faFlightId - FlightAware flight ID (fa_flight_id)
 * @returns {Promise<Object>} Detailed flight data
 * @throws {AppError} If request fails
 */
async function getFlightDetails(faFlightId) {
  try {
    if (!faFlightId) {
      throw new AppError("Flight ID is required", 400, "MISSING_FLIGHT_ID");
    }

    const response = await makeAeroAPIRequest(`/flights/${faFlightId}`);

    if (!response.fa_flight_id) {
      throw new AppError("Flight not found", 404, "FLIGHT_NOT_FOUND");
    }

    return formatFlightData(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to get flight details: ${error.message}`,
      500,
      "FLIGHT_DETAILS_ERROR"
    );
  }
}

module.exports = {
  searchFlight,
  getFlightDetails,
  formatFlightData,
};
