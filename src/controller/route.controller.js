// src/controllers/route.controller.js
const {
    getActivityById,
    findAirportForActivity,
    findAirportNearActivity,
    fetchDirections,
    CITY_CENTERS,
    COUNTRY_ISO2
  } = require("../models/route.model");
  
  async function getRouteToActivity(req, res, next) {
    try {
      const activityId = req.params.activityId;
      const { mode = "driving", airportSize = "all" } = req.query;
  
      const activity = await getActivityById(activityId);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
  
      if (activity.latitude == null || activity.longitude == null) {
        return res.status(400).json({ error: "Activity has no coordinates" });
      }
  
      const to = [activity.longitude, activity.latitude];
  
      const airport = await findAirportForActivity(activity, airportSize);
      if (!airport) {
        return res
          .status(400)
          .json({ error: "Could not find airport near this activity" });
      }
  
      const route = await fetchDirections({
        from: airport.coords,
        to,
        profile: mode
      });
  
      res.json({
        start: {
          label: airport.name,
          lon: airport.coords[0],
          lat: airport.coords[1],
          type: airport.type
        },
        activity: {
          id: activity.id,
          name: activity.name,
          city: activity.city,
          country: activity.country,
          lon: to[0],
          lat: to[1]
        },
        route
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      next(err);
    }
  }

  async function getRouteToCustom(req, res, next) {
    try {
      const { lat, lon, city, country, airportSize = "large" } = req.body || {};
      const latitude = Number(lat);
      const longitude = Number(lon);

      if (!lat || !lon || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return res.status(400).json({ error: "Missing or invalid lat/lon for custom activity" });
      }

      const countryIso2 = country ? COUNTRY_ISO2[country] || null : null; // re-use map if exported
      const airport = await findAirportNearActivity(latitude, longitude, countryIso2, airportSize);
      if (!airport) {
        return res
          .status(400)
          .json({ error: "Could not find airport near this activity" });
      }

      const to = [longitude, latitude];

      const route = await fetchDirections({
        from: airport.coords,
        to,
        profile: "driving"
      });

      res.json({
        start: {
          label: airport.name,
          lon: airport.coords[0],
          lat: airport.coords[1],
          type: airport.type
        },
        activity: {
          id: null,
          name: req.body.name || "Custom activity",
          city: city || "",
          country: country || "",
          lon: to[0],
          lat: to[1]
        },
        route
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      next(err);
    }
  }
  
  module.exports = {
    getRouteToActivity,
    getRouteToCustom
  };
  