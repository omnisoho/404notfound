const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { prisma } = require("../prismaClient");
const axios = require("axios");

const router = express.Router();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

// Forward geocode one activity using Mapbox
async function geocodeActivityWithMapbox(activity) {
  if (!MAPBOX_TOKEN) {
    throw new Error("MAPBOX_TOKEN is not set in environment.");
  }

  const name = activity.name || "";
  const city = activity.city || "";
  const country = activity.country || "";

  // Build search text: "name, city, country"
  const searchText = [name, city, country].filter(Boolean).join(", ");

  const url = `${MAPBOX_GEOCODE_URL}/${encodeURIComponent(searchText)}.json`;

  const params = {
    access_token: MAPBOX_TOKEN,
    limit: 1,
    language: "en"
  };

  const res = await axios.get(url, { params });
  const features = (res.data && res.data.features) || [];
  if (!features.length) return null;

  const feat = features[0];
  const [lon, lat] = feat.center; // Mapbox center is [lon, lat]

  return { lat, lon };
}

// POST /api/activities/geocode-missing
router.post("/geocode-missing", requireAuth, async (req, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      where: {
        OR: [{ latitude: null }, { longitude: null }]
      }
    });

    console.log("Geocode-missing found", activities.length, "activities");

    const updates = [];

    for (const a of activities) {
      console.log(
        "Checking activity",
        a.id,
        a.name,
        a.city,
        a.country,
        a.latitude,
        a.longitude
      );

      // Skip if no city/country context at all
      if (!a.city && !a.country) continue;

      try {
        const coords = await geocodeActivityWithMapbox(a);
        console.log("Geocode result for", a.id, a.name, "=>", coords);
        if (!coords) continue;

        const updated = await prisma.activity.update({
          where: { id: a.id },
          data: {
            latitude: coords.lat,
            longitude: coords.lon
          }
        });

        updates.push({
          id: updated.id,
          name: updated.name,
          lat: updated.latitude,
          lon: updated.longitude
        });
      } catch (err) {
        console.error(
          "Failed to geocode activity",
          a.id,
          a.name,
          err.message
        );
      }
    }

    res.json({
      updatedCount: updates.length,
      updated: updates
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
