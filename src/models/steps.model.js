const prisma = require('./prismaClient');

async function saveSteps(userId, tripName, date, steps) {
  try {
    // First, find the trip
    const trip = await prisma.trip.findFirst({
      where: {
        createdBy: userId,
        tripName: tripName,
      },
    });

    if (!trip) {
      throw new Error(`Trip '${tripName}' not found for user`);
    }

    // Validate that the date is within the trip's date range
    const inputDate = new Date(date);
    const tripStart = new Date(trip.startDate);
    const tripEnd = new Date(trip.endDate);
    
    // Set times to midnight for accurate date comparison
    inputDate.setHours(0, 0, 0, 0);
    tripStart.setHours(0, 0, 0, 0);
    tripEnd.setHours(0, 0, 0, 0);
    
    if (inputDate < tripStart || inputDate > tripEnd) {
      throw new Error(`Date must be within trip dates (${trip.startDate.toISOString().split('T')[0]} to ${trip.endDate.toISOString().split('T')[0]})`);
    }

    // Parse the date string to Date object
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = eventDate.getDay();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[dayOfWeek];

    // Check if an analytics event for this date already exists
    // Get all daily_steps events for this trip and filter in JavaScript
    const allStepsEvents = await prisma.analyticsEvent.findMany({
      where: {
        tripId: trip.id,
        eventType: 'daily_steps',
      },
    });
    
    const existingEvent = allStepsEvents.find(event => {
      return event.eventData && event.eventData.date === date;
    });

    let result;

    if (existingEvent) {
      // Update existing event
      result = await prisma.analyticsEvent.update({
        where: {
          id: existingEvent.id,
        },
        data: {
          eventData: {
            day: dayName,
            date: date,
            steps: steps,
          },
        },
      });
      console.log('Updated existing steps event:', result.id);
    } else {
      // Create new event
      result = await prisma.analyticsEvent.create({
        data: {
          tripId: trip.id,
          eventType: 'daily_steps',
          eventData: {
            day: dayName,
            date: date,
            steps: steps,
          },
        },
      });
      console.log('Created new steps event:', result.id);
    }

    return {
      id: result.id,
      tripId: result.tripId,
      date: date,
      steps: steps,
      day: dayName,
    };
  } catch (error) {
    console.error('Error in saveSteps:', error);
    throw error;
  }
}

module.exports = {
  saveSteps,
};
