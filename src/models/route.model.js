// src/models/route.model.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { prisma } = require("../prismaClient");

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
const MAPBOX_DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";

// City centres 
const CITY_CENTERS = {
  Tokyo: [139.6917, 35.6895],
  Helsinki: [24.9384, 60.1699],
  Rovaniemi: [25.724, 66.503],
  Beijing: [116.4074, 39.9042],
  Barcelona: [2.1734, 41.3851],
  Paris: [2.3522, 48.8566],
  "New York": [-73.9855, 40.758],
  Sydney: [151.2093, -33.8688],
  "Cape Town": [18.4241, -33.9249],
  "Lake Louise": [-116.1773, 51.4254]
};

// ---- Load airports from CSV once ----
let airports = [];

function loadAirports() {
  if (airports.length) return;

  const filePath = path.join(__dirname, "..", "data", "airports.csv");
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  if (!lines.length) throw new Error("airports.csv is empty or missing");

  // Split and strip double quotes
  const header = lines[0]
    .split(",")
    .map(h => h.replace(/^"|"$/g, ""));

  const idx = name => header.indexOf(name);

  const idxType = idx("type");
  const idxName = idx("name");
  const idxCountry = idx("iso_country");
  const idxLat = idx("latitude_deg");
  const idxLon = idx("longitude_deg");

  if (
    idxType === -1 ||
    idxName === -1 ||
    idxCountry === -1 ||
    idxLat === -1 ||
    idxLon === -1
  ) {
    console.log("Airports header:", header);
    throw new Error(
      "airports.csv does not have expected OurAirports columns (type,name,iso_country,latitude_deg,longitude_deg)."
    );
  }

  airports = lines
    .slice(1)
    .filter(line => line.trim().length > 0)
    .map(line => {
      const cols = line
        .split(",")
        .map(v => v.replace(/^"|"$/g, "")); // strip quotes

      const type = cols[idxType];      // large_airport / medium_airport / small_airport / ...
      const name = cols[idxName];      // e.g. "Edwards Air Force Base"
      const country = cols[idxCountry];
      const lat = parseFloat(cols[idxLat]);
      const lon = parseFloat(cols[idxLon]);
      if (!name || !country || isNaN(lat) || isNaN(lon)) return null;

      const lowerName = name.toLowerCase();
      if (
        lowerName.includes("air force base") ||
        lowerName.includes("airforce base") ||
        lowerName.includes("afb") ||
        lowerName.includes("air base") ||
        lowerName.includes("military")
      ) {
        return null;
      }

      // keep to filter
      return { type, name, country, lat, lon };
    })
    .filter(a => a);

  console.log("Loaded airports:", airports.length);
}

// ---- Haversine distance (km) ----
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = v => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Accept: "large" | "medium" | "small" | "all"
function airportMatchesSize(airport, size) {
  if (!size || size === "all") return true;
  if (size === "large") return airport.type === "large_airport";
  if (size === "medium") return airport.type === "medium_airport";
  if (size === "small") return airport.type === "small_airport";
  if (size === "heliport") return airport.type === "heliport";
  return true;
}

// ---- Find nearest airport to an activity coordinate ----
async function findAirportNearActivity(lat, lon, countryIso2, airportSize) {
  loadAirports();

  let best = null;
  let bestDist = Infinity;

  for (const a of airports) {
    if (countryIso2 && a.country && a.country !== countryIso2) continue;
    if (!airportMatchesSize(a, airportSize)) continue;

    const d = haversineKm(lat, lon, a.lat, a.lon);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }

  if (!best) return null;

  return {
    name: best.name,
    coords: [best.lon, best.lat],
    type: best.type
  };
}

// Map country names to ISO2 codes 
const COUNTRY_ISO2 = {
  Canada: "CA",
  "United States": "US",
  Japan: "JP",
  Spain: "ES",
  France: "FR",
  Italy: "IT",
  Brazil: "BR",
  Peru: "PE",
  Australia: "AU",
  "United Arab Emirates": "AE",
  Turkey: "TR",
  Jordan: "JO",
  Cambodia: "KH",
  Singapore: "SG",
  China: "CN",
  "South Africa": "ZA",
  Greece: "GR"
};

// ===== Public DB + routing functions =====
async function getActivityById(activityId) {
  return prisma.activity.findUnique({
    where: { id: Number(activityId) }
  });
}


async function findAirportForActivity(activity, airportSize) {
  const countryIso2 = COUNTRY_ISO2[activity.country] || null;
  return findAirportNearActivity(
    activity.latitude,
    activity.longitude,
    countryIso2,
    airportSize
  );
}

// Mapbox directions
async function fetchDirections({ from, to, profile = "driving" }) {
  if (!MAPBOX_TOKEN) {
    const e = new Error("MAPBOX_TOKEN is not set in environment.");
    e.status = 500;
    throw e;
  }

  const mapboxProfile =
    profile === "walking" ? "walking" :
    profile === "cycling" ? "cycling" :
    "driving";

  const url = `${MAPBOX_DIRECTIONS_BASE}/${mapboxProfile}/${from[0]},${from[1]};${to[0]},${to[1]}`;

  const res = await axios.get(url, {
    params: {
      geometries: "geojson",
      access_token: MAPBOX_TOKEN
    }
  });

  if (!res.data.routes || !res.data.routes.length) {
    const e = new Error("No route returned by routing service. Change the airport size and try again.");
    e.status = 400;
    throw e;
  }

  const route = res.data.routes[0];

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry
  };
}

module.exports = {
  getActivityById,
  findAirportForActivity,
  findAirportNearActivity,
  fetchDirections,
  COUNTRY_ISO2,
  CITY_CENTERS,
};
