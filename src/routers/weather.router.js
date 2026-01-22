const express = require('express');
const { generateWeatherController, getWeatherController, getWeatherByCityController } = require('../controller/weather');

const router = express.Router();

// Generate weather for a trip
// POST /weather/generate/:tripName
router.post('/generate/:tripName', generateWeatherController);

// GET /weather/city/:cityName
router.get('/city/:cityName', getWeatherByCityController);

// Get stored weather for a trip
// GET /weather/:tripName
router.get('/:tripName', getWeatherController);

module.exports = router;
