const prisma = require('../models/prismaClient');
const { getWeatherByCity } = require('../services/weatherService');

// Generate and save weather for all trip destinations
// POST /weather/generate/:tripName
async function generateWeatherController(req, res, next) {
  try {
    const { tripName } = req.params;

    // Find the trip with destinations
    const trip = await prisma.trip.findFirst({
      where: { tripName },
      include: { destinations: true },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (!trip.destinations || trip.destinations.length === 0) {
      return res.status(400).json({ error: 'Trip has no destinations' });
    }

    // Fetch weather for each destination city
    const weatherByCity = {};
    const weatherResults = [];
    
    for (const destination of trip.destinations) {
      try {
        const weather = await getWeatherByCity(destination.city);
        if (weather) {
          weatherByCity[destination.city] = weather;
          weatherResults.push({
            city: destination.city,
            success: true,
            data: weather,
          });
        } else {
          weatherResults.push({
            city: destination.city,
            success: false,
            error: 'Failed to fetch weather',
          });
        }
      } catch (error) {
        weatherResults.push({
          city: destination.city,
          success: false,
          error: error.message,
        });
      }
    }

    // Delete old weather snapshot for this trip
    await prisma.analyticsEvent.deleteMany({
      where: {
        tripId: trip.id,
        eventType: 'weather_snapshot',
      },
    });

    // Create new weather snapshot with all destinations
    await prisma.analyticsEvent.create({
      data: {
        tripId: trip.id,
        userId: trip.createdBy,
        eventType: 'weather_snapshot',
        eventData: weatherByCity,
      },
    });

    res.json({
      tripName,
      generated: new Date(),
      results: weatherResults,
      weatherData: weatherByCity,
    });
  } catch (error) {
    next(error);
  }
}

// Get stored weather for a trip
// GET /weather/:tripName
async function getWeatherController(req, res, next) {
  try {
    const { tripName } = req.params;

    const trip = await prisma.trip.findFirst({
      where: { tripName },
      include: {
        analyticsEvents: {
          where: { eventType: 'weather_snapshot' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        destinations: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const weatherEvent = trip.analyticsEvents[0];
    if (!weatherEvent) {
      return res.status(404).json({ 
        error: 'No weather data available',
        message: 'Run POST /weather/generate/:tripName to generate weather data'
      });
    }

    res.json({
      tripName,
      destinations: trip.destinations.map(d => d.city),
      generatedAt: weatherEvent.createdAt,
      weather: weatherEvent.eventData,
    });
  } catch (error) {
    next(error);
  }
}

// Get weather for a specific city (live API call, not stored)
// GET /weather/city/:cityName
async function getWeatherByCityController(req, res, next) {
  try {
    const { cityName } = req.params;

    const weather = await getWeatherByCity(cityName);

    if (!weather) {
      return res.status(404).json({ 
        error: 'Weather data not available',
        message: `Could not fetch weather for ${cityName}`
      });
    }

    res.json({
      city: cityName,
      fetchedAt: new Date(),
      weather,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generateWeatherController,
  getWeatherController,
  getWeatherByCityController,
};
