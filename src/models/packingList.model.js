const { connect } = require('http2');
const prisma = require('./prismaClient');

module.exports.getAllPackingList = async function getAllPackingList(tripId, userId) {
  return prisma.packingSelection.findMany({
    where: {
      tripId: tripId,
      userId: userId
    },
    include:{
      template: true
    }
  });
};

module.exports.getSpecificUser = async function getSpecificUser(userId) {
    if (!userId) return null; // 👈 ADD THIS SAFEGUARD
  return prisma.user.findMany({
    where: {
      id: userId
    }
  });
};

module.exports.addPackingItem = async function addPackingItem(
  tripId,
  userId,
  templateId,
  customName
) {
  if (!tripId || !userId) throw new Error("tripId and userId are required");

  return prisma.packingSelection.create({
    data: {
      tripId,
      userId,
      templateId,
      customName,
      isChecked: false
    },
    include: {
      trip: true,
      user: true,
      template: true
    }
  });
};

module.exports.deletePackingItem = async function deletePackingItem(
  itemId,
  userId) {
  const item = await prisma.packingSelection.findUnique({
    where: { id: itemId },
  });

  if (!item) throw new Error("Packing item not found");

  if (item.userId !== userId) throw new Error("Unauthorized");

  // Delete the item
  await prisma.packingSelection.delete({
    where: { id: itemId },
  });

  return; // success
};

module.exports.updatePackingItem = async function updatePackingItem(id, userId, data) {
  const existing = await prisma.packingSelection.findUnique({ where: { id } });
  if (!existing) throw new Error("Item not found");
  if (existing.userId !== userId) throw new Error("Not authorized");

  return prisma.packingSelection.update({
    where: { id },
    data
  });
};

module.exports.recommendPackingItem = async function recommendPackingItem(
  suggestBy,      // UUID of the user suggesting
  suggestTo,      // UUID of the user to receive the recommendation
  tripId,         // UUID of the trip
  templateId = null, // optional, UUID of template item
  customName = null  // optional, custom item name
) {
  if (!suggestBy || !suggestTo || !tripId) {
    throw new Error("suggestBy, suggestTo, and tripId are required");
  }

  return prisma.packingListRecommendation.create({
    data: {
      suggestedBy: {connect: { id: suggestBy }},
      suggestedTo: {connect: { id: suggestTo }},
      trip: {connect: { id: tripId }},
      template: templateId ? {connect: { id: templateId }} : undefined,
      customName,
      status: "PENDING"
    },
    include: {
      suggestedBy: true, // relation if you define it in Prisma
      suggestedTo: true,
      template: true
    }
  });
};

module.exports.getPackingListRecommendation = async function getPackingListRecommendation(tripId, userId) {
  if (!tripId || !userId) throw new Error("tripId and userId are required");

  return prisma.packingListRecommendation.findMany({
    where: {
      tripId: tripId,
      suggestTo: userId  // ✅ use the FK field, not connect
    },
    include: {
      suggestedBy: true,   // Include the user who suggested
      template: true         // Include template info if applicable
    },
    orderBy: {
      createdAt: 'desc'      // newest first
    }
  });
};

module.exports.rejectPackingListRecommendation = async function rejectPackingListRecommendation(recommendationId, userId) {
  if (!recommendationId || !userId) throw new Error("recommendationId and userId are required");

  return prisma.packingListRecommendation.updateMany({
    where: {
      id: recommendationId,
      suggestTo: userId // ✅ filter by FK
    },
    data: {
      status: "REJECTED"    // ✅ mark as rejected
    }
  });
};

module.exports.approvePackingListRecommendation = async function approvePackingListRecommendation(recommendationId, userId) {
  if (!recommendationId || !userId) throw new Error("recommendationId and userId are required");

  // Find the recommendation first
  const recommendation = await prisma.packingListRecommendation.findFirst({
    where: {
      id: recommendationId,
      suggestTo: userId
    }
  });

  if (!recommendation) throw new Error("Recommendation not found or not authorized");

  // Use a transaction to update status and add to packingSelection
  const [updatedRecommendation, newPackingSelection] = await prisma.$transaction([
    prisma.packingListRecommendation.update({
      where: { id: recommendationId },
      data: { status: "APPROVED" },
      include: {
        suggestedBy: true,
        template: true
      }
    }),
    prisma.packingSelection.create({
      data: {
        tripId: recommendation.tripId,
        userId: recommendation.suggestTo,
        templateId: recommendation.templateId,
        customName: recommendation.customName,
        isChecked: false
      },
      include: {
        trip: true,
        user: true,
        template: true
      }
    })
  ]);

  return { updatedRecommendation, newPackingSelection };
};

