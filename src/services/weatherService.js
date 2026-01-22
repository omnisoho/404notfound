// Weather service using Open-Meteo API (free, no auth required)
// Switch to OpenWeatherMap for more features if needed

const https = require('https');
const { URL } = require('url');

// HTTPS request helper
function fetchUrl(urlString) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'TravelDashboard/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: async () => JSON.parse(data)
            });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Convert city name to coordinates with country validation
async function geocodeCity(city, expectedCountry = null) {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`;
    const response = await fetchUrl(geoUrl);
    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error(`City not found: ${city}`);
    }
    
    // If country specified, find matching result
    if (expectedCountry) {
      const match = data.results.find(result => 
        result.country && result.country.toLowerCase() === expectedCountry.toLowerCase()
      );
      
      if (!match) {
        return null; // City exists but not in specified country
      }
      
      return {
        latitude: match.latitude,
        longitude: match.longitude,
        name: match.name,
        country: match.country
      };
    }
    
    // No country specified, return first result
    return {
      latitude: data.results[0].latitude,
      longitude: data.results[0].longitude,
      name: data.results[0].name,
      country: data.results[0].country
    };
  } catch (error) {
    console.error(`Error geocoding ${city}:`, error.message);
    return null;
  }
}

// Get weather by coordinates, optionally for a specific date range
async function getWeatherByCoordinates(latitude, longitude, startDate = null, endDate = null) {
  try {
    let url;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Use provided dates if available
    if (startDate && endDate) {
      // Handle Date objects or strings
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      
      // Check for invalid dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid dates provided to weather API:', { startDate, endDate });
        return null;
      }
      
      // Format to YYYY-MM-DD
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      // Pick forecast or historical API based on date
      if (start >= today) {
        // Future dates - use forecast API
        // Calculate days from today
        const daysFromToday = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
        const tripDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        // Open-Meteo forecast supports up to 16 days ahead
        if (daysFromToday + tripDuration <= 16) {
          // Can get full trip forecast
          const forecastDays = daysFromToday + tripDuration;
          url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=${forecastDays}`;
        } else {
          // Trip extends beyond 16-day limit, get maximum available
          url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=16`;
        }
      } else {
        // Historical API for past dates
        url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startStr}&end_date=${endStr}`;
      }
    } else {
      // Default to current weather + 7-day forecast
      url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
    }
    
    const response = await fetchUrl(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    return normalizeWeatherData(data, startDate, endDate);
  } catch (error) {
    console.error('Error fetching weather:', error.message);
    return null;
  }
}

// Get weather for a city, optionally for specific dates
async function getWeatherByCity(city, country = '', startDate = null, endDate = null) {
  const coords = await geocodeCity(city);
  if (!coords) return null;
  
  const weather = await getWeatherByCoordinates(coords.latitude, coords.longitude, startDate, endDate);
  if (weather) {
    weather.city = coords.name;
    weather.country = country || 'Unknown';
  }
  return weather;
}

// Format API response for dashboard
function normalizeWeatherData(apiData, startDate = null, endDate = null) {
  const daily = apiData.daily || {};
  
  // Build current weather
  let current;
  if (apiData.current) {
    // Got current data from API
    current = {
      condition: getWeatherDescription(apiData.current.weather_code) || 'Unknown',
      temperatureC: Math.round(apiData.current.temperature_2m),
      feelsLikeC: Math.round(apiData.current.temperature_2m), // Feels-like not available in free tier
      humidityPercent: apiData.current.relative_humidity_2m || 0,
    };
  } else if (daily.time && daily.time.length > 0) {
    // Use first forecast day as current
    let firstIndex = 0;
    
    // If we have a start date, find the matching index
    if (startDate) {
      const startStr = startDate instanceof Date 
        ? startDate.toISOString().split('T')[0]
        : startDate;
      firstIndex = daily.time.findIndex(d => d === startStr);
      if (firstIndex === -1) firstIndex = 0;
    }
    
    current = {
      condition: getWeatherDescription(daily.weather_code?.[firstIndex]) || 'Unknown',
      temperatureC: Math.round((daily.temperature_2m_max?.[firstIndex] + daily.temperature_2m_min?.[firstIndex]) / 2 || 0),
      feelsLikeC: Math.round((daily.temperature_2m_max?.[firstIndex] + daily.temperature_2m_min?.[firstIndex]) / 2 || 0),
      humidityPercent: 0, // Daily data doesn't include humidity
    };
  } else {
    return null;
  }

  // Filter forecast to match requested date range
  let forecastDays = daily.time || [];
  let weatherCodes = daily.weather_code || [];
  let tempMaxes = daily.temperature_2m_max || [];
  let tempMins = daily.temperature_2m_min || [];
  let isPartialForecast = false;
  let forecastLimitDate = null;
  
  if (startDate && endDate && forecastDays.length > 0) {
    const startStr = startDate instanceof Date 
      ? startDate.toISOString().split('T')[0]
      : startDate;
    const endStr = endDate instanceof Date 
      ? endDate.toISOString().split('T')[0]
      : endDate;
    
    const startIdx = forecastDays.findIndex(d => d >= startStr);
    const endIdx = forecastDays.findIndex(d => d > endStr);
    
    if (startIdx !== -1) {
      const sliceEnd = endIdx !== -1 ? endIdx : forecastDays.length;
      
      // Check if we're getting partial data
      if (endIdx === -1 && forecastDays[forecastDays.length - 1] < endStr) {
        isPartialForecast = true;
        forecastLimitDate = forecastDays[forecastDays.length - 1];
      }
      
      forecastDays = forecastDays.slice(startIdx, sliceEnd);
      weatherCodes = weatherCodes.slice(startIdx, sliceEnd);
      tempMaxes = tempMaxes.slice(startIdx, sliceEnd);
      tempMins = tempMins.slice(startIdx, sliceEnd);
    }
  }

  const result = {
    current,
    outlook: forecastDays.map((date, index) => ({
      day: formatDate(new Date(date)),
      icon: getWeatherIcon(weatherCodes[index]),
      summary: getWeatherDescription(weatherCodes[index]),
      min: Math.round(tempMins[index] || 0),
      max: Math.round(tempMaxes[index] || 0),
    })),
  };
  
  // Add warning if forecast is incomplete
  if (isPartialForecast && forecastLimitDate) {
    result.forecastWarning = `Weather forecast limited to ${forecastLimitDate} (16-day API limit)`;
  }
  
  return result;
}

// Convert WMO codes to emoji icons
// https://www.open-meteo.com/en/docs
function getWeatherIcon(code) {
  if (!code) return '❓';
  
  const iconMap = {
    0: '☀️',    // Clear sky
    1: '🌤️',   // Mainly clear
    2: '⛅',    // Partly cloudy
    3: '☁️',    // Overcast
    45: '🌫️',  // Foggy
    48: '🌫️',  // Foggy (rime)
    51: '🌧️',  // Drizzle (light)
    53: '🌧️',  // Drizzle (moderate)
    55: '🌧️',  // Drizzle (dense)
    61: '🌧️',  // Rain (slight)
    63: '🌧️',  // Rain (moderate)
    65: '⛈️',  // Rain (heavy)
    71: '❄️',   // Snow (slight)
    73: '❄️',   // Snow (moderate)
    75: '❄️',   // Snow (heavy)
    77: '❄️',   // Snow grains
    80: '🌧️',  // Showers (slight)
    81: '🌧️',  // Showers (moderate)
    82: '⛈️',  // Showers (violent)
    85: '❄️',   // Snow showers (slight)
    86: '❄️',   // Snow showers (heavy)
    95: '⛈️',  // Thunderstorm
    96: '⛈️',  // Thunderstorm with hail
    99: '⛈️',  // Thunderstorm with hail
  };

  return iconMap[code] || '❓';
}

// Convert WMO codes to readable text
function getWeatherDescription(code) {
  if (!code) return 'Unknown conditions';

  const descMap = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy with rime',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight showers',
    81: 'Moderate showers',
    82: 'Violent showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail',
  };

  return descMap[code] || 'Unknown conditions';
}

// Format date as "Mon 15", "Tue 16" etc
function formatDate(date) {
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric' });
  return fmt.format(date);
}

// Get weather for all destinations in a trip
async function getWeatherForTrip(destinations, startDate, endDate) {
  if (!destinations || destinations.length === 0) {
    return {
      weather: null,
      message: 'No destinations added to this trip'
    };
  }

  // Convert dates to Date objects if they're strings
  const tripStart = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const tripEnd = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysFromNow = Math.ceil((tripStart - today) / (1000 * 60 * 60 * 24));
  const tripDuration = Math.ceil((tripEnd - tripStart) / (1000 * 60 * 60 * 24)) + 1;
  
  let weatherMessage = null;
  
  // Check if trip is too far in the past
  if (daysFromNow < -90) {
    return {
      weather: null,
      message: 'Weather data not available for trips more than 90 days in the past'
    };
  }
  
  // Check forecast availability (16-day limit)
  if (daysFromNow > 0 && daysFromNow >= 16) {
    return {
      weather: null,
      message: 'Weather forecast not yet available (trip starts beyond 16-day forecast window)'
    };
  }
  
  if (daysFromNow > 0 && daysFromNow + tripDuration > 16) {
    const availableDays = Math.max(0, 16 - daysFromNow);
    weatherMessage = `Partial weather forecast (showing ${availableDays} of ${tripDuration} days due to 16-day API limit)`;
  }

  // Fetch weather for the first destination
  const firstCity = destinations[0].city;
  
  try {
    const startDateStr = tripStart.toISOString().split('T')[0];
    const endDateStr = tripEnd.toISOString().split('T')[0];
    
    const weatherData = await getWeatherByCity(firstCity, startDateStr, endDateStr);
    
    return {
      weather: weatherData,
      message: weatherMessage
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return {
      weather: null,
      message: 'Unable to fetch weather data'
    };
  }
}

module.exports = {
  getWeatherByCity,
  getWeatherByCoordinates,
  geocodeCity,
  getWeatherForTrip,
};
