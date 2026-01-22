const prisma = require('./prismaClient');

module.exports.getAllPackingItems = async function getAllPackingItems() {
  return prisma.packingItemTemplate.findMany({});
};