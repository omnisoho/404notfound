const createError = require('http-errors');
const prisma = require('./prismaClient');
const { getWeatherByCity } = require('../services/weatherService');

function formatDateRange(startDate, endDate) {
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
}

function formatForecastDate(dateString) {
  const date = new Date(dateString);
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric' });
  return fmt.format(date);
}

function summarizePersonality(profile) {
  if (!profile) {
    return {
      archetype: 'Undefined Traveler',
      summary: 'Add a personality profile to unlock richer insights.',
      highlights: [],
      growthAreas: [],
    };
  }

  const highlights = [];
  const growthAreas = [];

  if (profile.foodieScore > 80) highlights.push('Food-led explorer');
  if (profile.cultureScore > 75) highlights.push('Seeks meaningful cultural stops');
  if (profile.nightOwlScore > 70) highlights.push('Prefers later evenings');
  if (profile.natureScore > 70) highlights.push('Values outdoor escapes');
  if (profile.budgetScore > 70) highlights.push('Keeps spending intentional');

  if (profile.adventurerScore < 50) growthAreas.push('Plan more adventurous detours');
  if (profile.shopaholicScore < 40) growthAreas.push('Schedule lighter retail time');
  if (profile.nightOwlScore > 70) growthAreas.push('Add buffer mornings after late nights');

  const archetype =
    profile.foodieScore > profile.cultureScore ? 'Curious Foodie' : 'Cultural Explorer';

  return {
    archetype,
    summary: `Prefers a ${profile.preferredTripPace} pace with balanced experiences.`,
    highlights,
    growthAreas,
  };
}

function buildFunStats({ distanceKm, stepsSeries, transports }) {
  const stats = [];
  if (distanceKm) {
    stats.push(`You travelled ${distanceKm} km this week.`);
  }

  if (stepsSeries.length) {
    const peak = stepsSeries.reduce((max, entry) => (entry.steps > max.steps ? entry : max), stepsSeries[0]);
    stats.push(`Biggest step day: ${peak.day} with ${peak.steps.toLocaleString()} steps.`);
  }

  if (transports.length) {
    stats.push(`Transport hops logged: ${transports.length}.`);
  }

  return stats;
}

function categorizeNotification(notification) {
  const message = `${notification.title} ${notification.message}`.toLowerCase();
  if (message.includes('delay') || message.includes('strike') || message.includes('rain')) {
    return 'warning';
  }
  return 'info';
}

function sumExpenses(expenses = []) {
  return expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
}

module.exports.getTravelDashboard = async function getTravelDashboard(tripName, requestingUserId) {
  // Find a trip where the user is the creator or a member
  const trip = await prisma.trip.findFirst({
    where: {
      tripName,
      OR: [
        { createdBy: requestingUserId },
        { members: { some: { userId: requestingUserId } } }
      ]
    },
    include: {
      creator: { include: { personalityProfile: true } },
      destinations: true,
      expenses: true,
      budgetCategories: { 
        include: { expenses: true } 
      },
      transports: true,
      aiLogs: true,
      analyticsEvents: true,
      members: true,
    },
  });

  if (!trip) {
    throw createError(404, 'Trip not found');
  }

  // Verify user is either the creator or a member
  const isCreator = trip.createdBy === requestingUserId;
  const isMember = trip.members.some(member => member.userId === requestingUserId);

  if (!isCreator && !isMember) {
    throw createError(403, 'You do not have permission to view this trip');
  }

  const userId = trip.createdBy;

  const [notifications, savedPlaces] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.savedPlace.findMany({
      where: { userId },
      include: { activity: true },
      orderBy: { addedAt: 'desc' },
      take: 3,
    }),
  ]);

  const stepsEvents = trip.analyticsEvents.filter((event) => event.eventType === 'daily_steps');
  const stepSeries = stepsEvents
    .map((event) => {
      const date = event.eventData?.date;
      const day = event.eventData?.day;
      // Format as "Day DD" (e.g., "Mon 22")
      let displayLabel = day || 'Unknown';
      if (date) {
        const dateObj = new Date(date);
        const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric' });
        displayLabel = fmt.format(dateObj);
      }
      return {
        day: displayLabel,
        date: date,
        steps: event.eventData?.steps || 0,
      };
    })
    .filter((entry) => entry.steps)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const distanceEvent = trip.analyticsEvents.find(
    (event) => event.eventType === 'distance_travelled'
  );
  const distanceKm = distanceEvent?.eventData?.totalKm || 0;

  // Fetch fresh weather data dynamically for the trip's first destination
  let weatherData = null;
  let weatherMessage = null;
  
  if (!trip.destinations || trip.destinations.length === 0) {
    weatherMessage = 'No destinations added to this trip - add a destination to see weather forecast';
  } else if (trip.destinations.length > 0) {
    try {
      const firstDestination = trip.destinations[0];
      
      // Convert dates to strings for API (Prisma returns Date objects)
      const startDateStr = trip.startDate instanceof Date 
        ? trip.startDate.toISOString().split('T')[0] 
        : trip.startDate;
      const endDateStr = trip.endDate instanceof Date 
        ? trip.endDate.toISOString().split('T')[0] 
        : trip.endDate;
      
      // Check if trip is within forecast range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tripStart = new Date(startDateStr);
      const tripEnd = new Date(endDateStr);
      const daysFromNow = Math.ceil((tripStart - today) / (1000 * 60 * 60 * 24));
      const tripDuration = Math.ceil((tripEnd - tripStart) / (1000 * 60 * 60 * 24)) + 1;
      
      // Check forecast availability
      if (daysFromNow < -90) {
        weatherMessage = 'Weather data not available for trips more than 90 days in the past';
      } else if (daysFromNow + tripDuration > 16) {
        const availableDays = Math.max(0, 16 - daysFromNow);
        if (availableDays === 0) {
          weatherMessage = 'Weather forecast not yet available (trip starts beyond 16-day forecast window)';
        } else {
          weatherMessage = `Partial weather forecast (showing ${availableDays} of ${tripDuration} days due to 16-day API limit)`;
        }
      }
      
      // Pass trip dates to get weather for the actual travel period
      const freshWeather = await getWeatherByCity(
        firstDestination.city, 
        firstDestination.country,
        startDateStr,
        endDateStr
      );
      
      if (freshWeather) {
        weatherData = freshWeather;
        
        // Update the stored weather snapshot in the background (don't await)
        const weatherByCity = {};
        weatherByCity[firstDestination.city] = freshWeather;
        
        // Fetch weather for other destinations if any
        for (let i = 1; i < trip.destinations.length; i++) {
          const dest = trip.destinations[i];
          try {
            const destWeather = await getWeatherByCity(
              dest.city, 
              dest.country,
              startDateStr,
              endDateStr
            );
            if (destWeather) {
              weatherByCity[dest.city] = destWeather;
            }
          } catch (err) {
            console.error(`Failed to fetch weather for ${dest.city}:`, err.message);
          }
        }
        
        // Update or create weather snapshot (non-blocking)
        prisma.analyticsEvent.deleteMany({
          where: { tripId: trip.id, eventType: 'weather_snapshot' }
        }).then(() => {
          return prisma.analyticsEvent.create({
            data: {
              tripId: trip.id,
              userId: trip.createdBy,
              eventType: 'weather_snapshot',
              eventData: weatherByCity,
            },
          });
        }).catch(err => console.error('Failed to update weather snapshot:', err.message));
      }
    } catch (error) {
      console.error('Failed to fetch fresh weather:', error.message);
      
      // Fallback to stored weather if live fetch fails
      const weatherEvent = trip.analyticsEvents.find(
        (event) => event.eventType === 'weather_snapshot'
      );
      
      if (weatherEvent?.eventData) {
        const weatherObj = weatherEvent.eventData;
        const cityKeys = Object.keys(weatherObj);
        if (cityKeys.length > 0 && weatherObj[cityKeys[0]]?.city) {
          const firstCity = trip.destinations[0]?.city || cityKeys[0];
          const cityWeather = weatherObj[firstCity] || weatherObj[cityKeys[0]];
          
          weatherData = {
            current: {
              condition: cityWeather.condition || 'Unknown',
              temperatureC: cityWeather.temperature || 0,
              feelsLikeC: cityWeather.feelsLike || cityWeather.temperature || 0,
              humidityPercent: cityWeather.humidity || 0,
            },
            outlook: (cityWeather.forecast || []).map(day => ({
              day: formatForecastDate(day.date),
              icon: cityWeather.icon || '❓',
              summary: day.condition || 'Unknown',
              min: day.tempMin || 0,
              max: day.tempMax || 0,
            }))
          };
        } else if (weatherObj.current || weatherObj.outlook) {
          weatherData = weatherObj;
        }
      }
    }
  }

  const totalCost = sumExpenses(trip.expenses);

  const categoryCosts = trip.budgetCategories.map((category) => ({
    category: category.categoryName,
    allocated: category.allocatedAmount,
    actual: sumExpenses(category.expenses),
  }));

  const insights = trip.aiLogs
    .map((log) => log.responseData?.insight)
    .filter((insight) => typeof insight === 'string' && insight.length);

  const attractions = savedPlaces
    .map((place) => ({
      name: place.activity?.name || 'Saved place',
      reason: place.activity?.description || 'Pinned for this trip.',
    }))
    .filter((item) => item.name);

  return {
    tripMeta: {
      tripId: trip.id,
      title: trip.tripName,
      dateRange: formatDateRange(trip.startDate, trip.endDate),
      startDate: trip.startDate.toISOString().split('T')[0],
      endDate: trip.endDate.toISOString().split('T')[0],
      days: Math.max(
        1,
        Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24))
      ),
      cities: trip.destinations.map((destination) => destination.city),
      status: trip.status || 'PLANNING',
    },
    totals: {
      totalCost,
      distanceKm,
    },
    steps: stepSeries,
    categoryCosts,
    weather: weatherData,
    weatherMessage: weatherMessage, 
    personality: summarizePersonality(trip.creator.personalityProfile),
    attractions,
    alerts: notifications.map((notification) => ({
      level: categorizeNotification(notification),
      title: notification.title,
      detail: notification.message,
    })),
    insights,
    funStats: buildFunStats({ distanceKm, stepsSeries: stepSeries, transports: trip.transports }),
  };
};

