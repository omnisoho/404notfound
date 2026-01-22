const prisma = require('../models/prismaClient');

/**
 * Calculate trip planning progress based on completion criteria
 * Returns a percentage (0-100) and whether planning is complete
 */
async function calculateTripProgress(tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      destinations: true,
      members: true,
      budgetCategories: true,
    },
  });

  if (!trip) {
    throw new Error('Trip not found');
  }

  // Define completion criteria with weights
  const criteria = [
    { check: trip.destinations.length > 0, weight: 25, name: 'destinations' },
    { check: trip.budgetTotal > 0, weight: 25, name: 'budget' },
    { check: trip.startDate && trip.endDate, weight: 25, name: 'dates' },
    { check: trip.members.length > 0, weight: 25, name: 'members' },
  ];

  // Calculate progress
  let progress = 0;
  criteria.forEach(criterion => {
    if (criterion.check) {
      progress += criterion.weight;
    }
  });

  return {
    progress,
    isComplete: progress === 100,
    missingCriteria: criteria.filter(c => !c.check).map(c => c.name),
  };
}

/**
 * Determine what the trip status should be based on dates
 */
function determineAutoStatus(trip) {
  const now = new Date();
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);

  // If trip has ended, it should be COMPLETED
  if (now > endDate) {
    return 'COMPLETED';
  }

  // If trip has started, it should be IN_PROGRESS
  if (now >= startDate && now <= endDate) {
    return 'IN_PROGRESS';
  }

  // Otherwise, still planning
  return 'PLANNING';
}

/**
 * Validate if a status transition is allowed
 */
function validateStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    PLANNING: ['PLANNING_COMPLETE', 'IN_PROGRESS'],
    PLANNING_COMPLETE: ['PLANNING', 'IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: [], // Can't transition from completed
  };

  const allowed = validTransitions[currentStatus];
  return allowed && allowed.includes(newStatus);
}

/**
 * Update trip state - auto-updates status based on dates
 */
async function updateTripState(tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new Error('Trip not found');
  }

  // Determine what status should be based on dates
  const autoStatus = determineAutoStatus(trip);

  // Prepare update data
  const updateData = {};

  // Auto-update status based on dates
  if (autoStatus === 'COMPLETED' && trip.status !== 'COMPLETED') {
    updateData.status = 'COMPLETED';
    updateData.completedAt = new Date();
  } else if (autoStatus === 'IN_PROGRESS' && (trip.status === 'PLANNING' || trip.status === 'PLANNING_COMPLETE')) {
    updateData.status = 'IN_PROGRESS';
  }

  // Only update if there are changes
  if (Object.keys(updateData).length === 0) {
    return trip;
  }

  // Update the trip
  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: updateData,
  });

  return updatedTrip;
}

/**
 * Manually change trip status with validation
 */
async function changeStatus(tripId, newStatus, userId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!trip) {
    throw new Error('Trip not found');
  }

  // Check if user is owner or editor
  const member = trip.members[0];
  const isCreator = trip.createdBy === userId;
  if (!isCreator && (!member || member.role === 'viewer')) {
    throw new Error('Insufficient permissions to change trip status');
  }

  // Validate transition
  if (!validateStatusTransition(trip.status, newStatus)) {
    throw new Error(`Cannot transition from ${trip.status} to ${newStatus}`);
  }

  // Update status
  const updateData = { status: newStatus };
  if (newStatus === 'COMPLETED' && !trip.completedAt) {
    updateData.completedAt = new Date();
  }

  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: updateData,
  });

  return updatedTrip;
}

module.exports = {
  calculateTripProgress,
  determineAutoStatus,
  validateStatusTransition,
  updateTripState,
  changeStatus,
};
