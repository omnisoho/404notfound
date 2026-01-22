const express = require("express");
const {
  getAllTrip,
  getTripById,
  addTrip,
  addTripMember,
  deleteTripMember,
  getTripMembers,
  getUserTrips,
  createTrip,
} = require("../models/trip.model");
const { verifyToken } = require("../middleware/auth.middleware");
const router = express.Router();

/**
 * GET /api/trip
 * Gets trips for the authenticated user
 * Requires authentication
 */
router.get("/", verifyToken, (req, res, next) => {
  getAllTrip(req.user.userId)
    .then((trip) => res.status(200).json(trip))
    .catch(next);
});

/**
 * GET /api/trip/all
 * Gets all trips (admin only - use with caution)
 * Requires authentication
 */
router.get("/all", verifyToken, async (req, res, next) => {
  try {
    // Optional: Add admin role check here
    // if (req.user.userRole !== 'admin') {
    //   return res.status(403).json({ error: 'Forbidden' });
    // }
    const trips = await getAllTrip();
    res.status(200).json(trips);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", verifyToken, (req, res, next) => {
  const tripId = req.params.id;
  getTripById(tripId)
    .then((trip) => res.status(200).json(trip))
    .catch(next);
});

router.post("/", verifyToken, (req, res, next) => {
  try {
    const userId = req.user.userId; // extract from token
    const data = {
      tripName: req.body.tripName,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      budgetTotal: req.body.budgetTotal,
      currency: req.body.currency,
      createdBy: userId,
    };
    addTrip(data)
      .then((newTrip) => res.status(201).json(newTrip))
      .catch(next);
  } catch (err) {
    next(err);
  }
});

// GET all members in a trip
router.get("/:tripId/members", verifyToken, (req, res, next) => {
  getTripMembers(req.params.tripId)
    .then((members) => {
      res.status(200).json({members: members, user: req.user});
    })
    .catch(next);
});

// ADD a member to a trip
router.post("/:tripId/members", verifyToken, (req, res, next) => {
  try {
    const data = {
      tripId: req.body.tripId,
      userId: req.body.userId,
      role: req.body.role || "member",
    };

    addTripMember(data)
      .then((newMember) => res.status(201).json(newMember))
      .catch(next);
  } catch (err) {
    next(err);
  }
});

// PATCH trip status - manually change trip status
router.patch("/:tripId/status", verifyToken, async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const { changeStatus } = require('../services/tripStateManager');
    const updatedTrip = await changeStatus(tripId, status, userId);

    res.json({ 
      message: 'Trip status updated successfully',
      trip: updatedTrip 
    });
  } catch (err) {
    next(err);
  }
});

// DELETE trip member
router.delete("/:id", verifyToken, (req, res, next) => {
  deleteTripMember(req.params.id)
    .then(() => res.status(204).end())
    .catch(next);
});

module.exports = router;
