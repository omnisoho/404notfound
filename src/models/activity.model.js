const { prisma } = require('../prismaClient');

function nameToImagePath(name) {
  if (!name) return '/assets/images/activity-placeholder.jpg';

  const base = name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '');

  if (!base) return '/assets/images/activity-placeholder.jpg';

  return `/assets/images/${base}.jpg`;
}

async function getAllActivities() {
  const activities = await prisma.activity.findMany({
    include: {
      categories: {
        include: { category: true },
      },
      votes: true,
      savedBy: true,
    },
  });

  return activities.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    region: row.country || '',
    tags: [row.city].filter(Boolean),
    price_level: row.priceEstimate ?? 0,
    halal: false,
    vegan: false,
    wheelchair: false,
    rating: Number(row.rating) || 0,
    img: nameToImagePath(row.name),
    description: row.description,
    indoor: row.indoor,
    latitude: row.latitude,
    longitude: row.longitude,
  }));
}

module.exports = { getAllActivities };
