const prisma = require('./prismaClient');
const { updateTripState } = require('../services/tripStateManager');

module.exports.getUserTripsAndSettings = async function getUserTripsAndSettings(userId) {
  const [tripMemberships, createdTrips, user] = await Promise.all([
    // Get all trips where user is a member
    prisma.tripMember.findMany({
      where: { userId },
      include: {
        trip: {
          include: {
            destinations: true
          }
        }
      }
    }),
    // Get trips created by user (for backwards compatibility with old trips without TripMember entries)
    prisma.trip.findMany({
      where: { createdBy: userId },
      include: {
        destinations: true
      }
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    })
  ]);

  // Create a map to track trips we've already added
  const tripMap = new Map();
  
  // Separate trips into owned and invited
  const myTrips = [];
  const invitedTrips = [];
  
  // First, add trips from memberships
  tripMemberships.forEach(membership => {
    const trip = membership.trip;
    tripMap.set(trip.id, true);
    
    // Sort destinations by orderIndex
    if (trip.destinations) {
      trip.destinations.sort((a, b) => a.orderIndex - b.orderIndex);
    }
    
    // Check if user is the creator/owner
    if (trip.createdBy === userId) {
      myTrips.push(trip);
    } else {
      invitedTrips.push(trip);
    }
  });
  
  // Add created trips that aren't already in the map (old trips without TripMember entries)
  createdTrips.forEach(trip => {
    if (!tripMap.has(trip.id)) {
      // Sort destinations by orderIndex
      if (trip.destinations) {
        trip.destinations.sort((a, b) => a.orderIndex - b.orderIndex);
      }
      myTrips.push(trip);
    }
  });

  // Sort both arrays by startDate (newest first)
  const sortByDate = (a, b) => new Date(b.startDate) - new Date(a.startDate);
  myTrips.sort(sortByDate);
  invitedTrips.sort(sortByDate);

  // Auto-update trip statuses based on current date
  const allTrips = [...myTrips, ...invitedTrips];
  await Promise.all(
    allTrips
      .filter(trip => trip.status !== 'COMPLETED')
      .map(trip => updateTripState(trip.id).catch(err => {
        console.error(`Failed to update status for trip ${trip.id}:`, err);
      }))
  );

  // Refetch trips to get updated statuses
  const [updatedMemberships, updatedCreatedTrips] = await Promise.all([
    prisma.tripMember.findMany({
      where: { userId },
      include: {
        trip: {
          include: {
            destinations: true
          }
        }
      }
    }),
    prisma.trip.findMany({
      where: { createdBy: userId },
      include: {
        destinations: true
      }
    })
  ]);

  // Rebuild trips arrays with updated data
  const updatedTripMap = new Map();
  const updatedMyTrips = [];
  const updatedInvitedTrips = [];
  
  updatedMemberships.forEach(membership => {
    const trip = membership.trip;
    updatedTripMap.set(trip.id, true);
    
    if (trip.destinations) {
      trip.destinations.sort((a, b) => a.orderIndex - b.orderIndex);
    }
    
    if (trip.createdBy === userId) {
      updatedMyTrips.push(trip);
    } else {
      updatedInvitedTrips.push(trip);
    }
  });
  
  updatedCreatedTrips.forEach(trip => {
    if (!updatedTripMap.has(trip.id)) {
      if (trip.destinations) {
        trip.destinations.sort((a, b) => a.orderIndex - b.orderIndex);
      }
      updatedMyTrips.push(trip);
    }
  });

  updatedMyTrips.sort(sortByDate);
  updatedInvitedTrips.sort(sortByDate);

  return {
    myTrips: updatedMyTrips,
    invitedTrips: updatedInvitedTrips,
    userCurrency: user?.currency || 'USD'
  };
};


module.exports.createTrip = async function createTrip(tripData) {
  const { tripName, startDate, endDate, budgetTotal, currency, destinations } = tripData;
  
  const trip = await prisma.trip.create({
    data: {
      tripName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budgetTotal: budgetTotal || 0,
      currency,
      createdBy: tripData.userId,
      destinations: {
        create: destinations.map((dest, index) => ({
          country: dest.country,
          city: dest.city,
          orderIndex: index
        }))
      }
    },
    include: {
      destinations: true
    }
  });

  return trip;
};
