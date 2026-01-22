const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const finlandTrip = await prisma.trip.findFirst({
    where: { tripName: 'Finland Fun' }
  });

  const japanTrip = await prisma.trip.findFirst({
    where: { tripName: 'Japan Autumn Adventure' }
  });

  const singaporeTrip = await prisma.trip.findFirst({
    where: { tripName: 'Singapore Holiday' }
  });

  const user = await prisma.user.findFirst({
    where: { id: 'fb9a5183-5a32-4b6a-abb6-05a130a4441f' }
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  // Finland Fun (Dec 15-22)
  if (finlandTrip) {
    await prisma.analyticsEvent.createMany({
      data: [
        {
          tripId: finlandTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Mon 15', date: '2025-12-15', steps: 8500 },
          createdAt: new Date('2025-12-15T12:00:00Z'),
        },
        {
          tripId: finlandTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Tue 16', date: '2025-12-16', steps: 12300 },
          createdAt: new Date('2025-12-16T12:00:00Z'),
        },
        {
          tripId: finlandTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Wed 17', date: '2025-12-17', steps: 9800 },
          createdAt: new Date('2025-12-17T12:00:00Z'),
        },
        {
          tripId: finlandTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Thu 18', date: '2025-12-18', steps: 14800 },
          createdAt: new Date('2025-12-18T12:00:00Z'),
        },
        {
          tripId: finlandTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Fri 19', date: '2025-12-19', steps: 11200 },
          createdAt: new Date('2025-12-19T12:00:00Z'),
        },
        {
          tripId: finlandTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Sat 20', date: '2025-12-20', steps: 6800 },
          createdAt: new Date('2025-12-20T12:00:00Z'),
        },
        {
          tripId: finlandTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Sun 21', date: '2025-12-21', steps: 7500 },
          createdAt: new Date('2025-12-21T12:00:00Z'),
        },
        {
          tripId: finlandTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Mon 22', date: '2025-12-22', steps: 10100 },
          createdAt: new Date('2025-12-22T12:00:00Z'),
        },
      ],
    });
  }

  // Japan Autumn (Nov 1-10)
  if (japanTrip) {
    await prisma.analyticsEvent.createMany({
      data: [
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Fri 1', date: '2025-11-01', steps: 9200 },
          createdAt: new Date('2025-11-01T12:00:00Z'),
        },
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Sat 2', date: '2025-11-02', steps: 15600 },
          createdAt: new Date('2025-11-02T12:00:00Z'),
        },
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Sun 3', date: '2025-11-03', steps: 18900 },
          createdAt: new Date('2025-11-03T12:00:00Z'),
        },
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Mon 4', date: '2025-11-04', steps: 13400 },
          createdAt: new Date('2025-11-04T12:00:00Z'),
        },
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Tue 5', date: '2025-11-05', steps: 16700 },
          createdAt: new Date('2025-11-05T12:00:00Z'),
        },
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Wed 6', date: '2025-11-06', steps: 14200 },
          createdAt: new Date('2025-11-06T12:00:00Z'),
        },
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Thu 7', date: '2025-11-07', steps: 19100 },
          createdAt: new Date('2025-11-07T12:00:00Z'),
        },
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Fri 8', date: '2025-11-08', steps: 12800 },
          createdAt: new Date('2025-11-08T12:00:00Z'),
        },
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Sat 9', date: '2025-11-09', steps: 8400 },
          createdAt: new Date('2025-11-09T12:00:00Z'),
        },
        {
          tripId: japanTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Sun 10', date: '2025-11-10', steps: 11500 },
          createdAt: new Date('2025-11-10T12:00:00Z'),
        },
      ],
    });
  }

  // Singapore (Dec 14-23)
  if (singaporeTrip) {
    await prisma.analyticsEvent.createMany({
      data: [
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Sun 14', date: '2025-12-14', steps: 7200 },
          createdAt: new Date('2025-12-14T12:00:00Z'),
        },
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Mon 15', date: '2025-12-15', steps: 11800 },
          createdAt: new Date('2025-12-15T12:00:00Z'),
        },
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Tue 16', date: '2025-12-16', steps: 13500 },
          createdAt: new Date('2025-12-16T12:00:00Z'),
        },
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Wed 17', date: '2025-12-17', steps: 15100 },
          createdAt: new Date('2025-12-17T12:00:00Z'),
        },
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Thu 18', date: '2025-12-18', steps: 9800 },
          createdAt: new Date('2025-12-18T12:00:00Z'),
        },
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Fri 19', date: '2025-12-19', steps: 12400 },
          createdAt: new Date('2025-12-19T12:00:00Z'),
        },
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Sat 20', date: '2025-12-20', steps: 8600 },
          createdAt: new Date('2025-12-20T12:00:00Z'),
        },
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Sun 21', date: '2025-12-21', steps: 7900 },
          createdAt: new Date('2025-12-21T12:00:00Z'),
        },
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Mon 22', date: '2025-12-22', steps: 10300 },
          createdAt: new Date('2025-12-22T12:00:00Z'),
        },
        {
          tripId: singaporeTrip.id,
          userId: user.id,
          eventType: 'daily_steps',
          eventData: { day: 'Tue 23', date: '2025-12-23', steps: 11700 },
          createdAt: new Date('2025-12-23T12:00:00Z'),
        },
      ],
    });
  }
}

main()
  .catch((e) => {
    console.error('Error seeding steps data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
