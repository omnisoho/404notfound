const prisma = require('./prismaClient');
const { getWeatherByCity } = require('../services/weatherService');

/**
 * Gets all trips (admin function - use with caution)
 * @param {string} user_id - Optional user ID to filter trips
 * @returns {Promise<Array>} Array of all trips or trips for a specific user
 */
module.exports.getAllTrip = async function getAllTrip(user_id) {
  if (user_id) {
    return prisma.trip.findMany({
      where: { createdBy: user_id }
    });
  }
  return prisma.trip.findMany();
};

module.exports.getTripById = async function getTripById(tripId) {
  return prisma.trip.findMany({
    where: { id: tripId}
  });
};

/**
 * Gets trips for a specific user
 * Follows Single Responsibility Principle: Only responsible for fetching user's trips
 * @param {string} userId - The user ID to filter trips by
 * @returns {Promise<Array>} Array of trips created by the user
 */
module.exports.getUserTrips = async function getUserTrips(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  return prisma.trip.findMany({
    where: {
      createdBy: userId,
    },
    include: {
      destinations: {
        orderBy: {
          orderIndex: 'asc',
        },
      },
    },
    orderBy: {
      startDate: 'desc',
    },
  });
};

module.exports.createTrip = async function createTrip(tripData) {
  // Create the trip and its destinations
  const trip = await prisma.trip.create({
    data: {
      ...tripData,
      destinations: tripData.destinations
        ? { create: tripData.destinations }
        : undefined,
    },
    include: { destinations: true },
  });

  // Fetch weather for all destinations and store as a single consolidated snapshot
  if (trip.destinations && trip.destinations.length > 0) {
    const weatherByCity = {};
    
    // Convert dates to strings (Prisma returns Date objects)
    const startDateStr = trip.startDate instanceof Date 
      ? trip.startDate.toISOString().split('T')[0] 
      : trip.startDate;
    const endDateStr = trip.endDate instanceof Date 
      ? trip.endDate.toISOString().split('T')[0] 
      : trip.endDate;
    
    for (const destination of trip.destinations) {
      try {
        const weather = await getWeatherByCity(
          destination.city, 
          destination.country,
          startDateStr,
          endDateStr
        );
        if (weather) {
          weatherByCity[destination.city] = weather;
        }
      } catch (error) {
        console.error(`Failed to fetch weather for ${destination.city}:`, error.message);
      }
    }

    // Only create weather snapshot if we got weather for at least one destination
    if (Object.keys(weatherByCity).length > 0) {
      await prisma.analyticsEvent.create({
        data: {
          tripId: trip.id,
          userId: trip.createdBy,
          eventType: 'weather_snapshot',
          eventData: weatherByCity,
        },
      });
    }
  }

  return trip;
};

module.exports.addTrip = async function addTrip(data) {
  return prisma.$transaction(async (tx) => {
    // 1️⃣ Create the trip
    const newTrip = await tx.trip.create({
      data: {
        tripName: data.tripName,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        budgetTotal: data.budgetTotal || 0,
        currency: data.currency || "SGD",
        createdBy: data.createdBy,
      },
    });

    // 2️⃣ Add creator as a TripMember with OWNER role
    await tx.tripMember.create({
      data: {
        tripId: newTrip.id,
        userId: data.createdBy,
        role: "owner",   // 🔥 ensure this matches your TripRole enum
      },
    });

    return newTrip;
  });
};

module.exports.addTripMember = async function addTripMember(data) {
  return prisma.tripMember.create({
    data: {
      tripId: data.tripId,
      userId: data.userId,
      role: data.role || "member"
    }
  });
};

module.exports.deleteTripMember = async function deleteTripMember(id) {
  return prisma.tripMember.delete({
    where: { id }
  });
};

module.exports.getTripMembers = async function getTripMembers(tripId) {
  return prisma.tripMember.findMany({
    where: { tripId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePictureUrl: true   // optional but useful
        }
      }
    }
  });
};
