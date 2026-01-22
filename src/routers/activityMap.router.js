// src/routers/activityMap.router.js
const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { prisma } = require("../prismaClient");

const router = express.Router();

// Get all activities that have coordinates
router.get("/map", requireAuth, async (req, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        type: true,
        rating: true
      }
    });
    res.json(activities);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
