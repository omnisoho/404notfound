const express = require("express");
const {
  getAllPackingList,
  addPackingItem,
  deletePackingItem,
  updatePackingItem,
  getSpecificUser,
  recommendPackingItem,
  getPackingListRecommendation,
  rejectPackingListRecommendation,
  approvePackingListRecommendation,
} = require("../models/packingList.model"); // <-- import both
const { verifyToken } = require("../middleware/auth.middleware");
const router = express.Router();

// GET packing list for a trip
router.get("/:id", verifyToken, (req, res, next) => {
  const tripId = req.params.id || null;
  const userId = req.query.userId || req.user.userId;
  getAllPackingList(tripId, userId)
    .then((items) => res.status(200).json(items))
    .catch(next);
});

router.put("/:id", verifyToken, (req, res, next) => {
  const itemId = req.params.id;
  const userId = req.user.userId;

  const { customName, isChecked } = req.body;

  updatePackingItem(itemId, userId, { customName, isChecked })
    .then((updated) => res.status(200).json(updated))
    .catch(next);
});

// POST a new packing item
router.post("/", verifyToken, (req, res, next) => {
  const tripId = req.body.tripId;
  const userId = req.user ? req.user.userId : null; // extract from token if available
  const templateId = req.body.templateId || null;
  const customName = req.body.customName || null;
  addPackingItem(tripId, userId, templateId, customName)
    .then((item) => res.status(201).json(item))
    .catch(next);
});

router.delete("/:id", verifyToken, (req, res, next) => {
  const itemId = req.params.id;

  deletePackingItem(itemId, req.user.userId)
    .then(() => res.status(204).end())
    .catch((err) => {
      if (err.message === "Packing item not found")
        return res.status(404).json({ error: err.message });
      if (err.message === "Unauthorized")
        return res.status(403).json({ error: err.message });
      next(err);
    });
});
router.get("/user/me", verifyToken, (req, res, next) => {
  res.status(200).json(req.user);
});

router.get("/user/:id", verifyToken, (req, res, next) => {
  const userId = req.params.id;
  getSpecificUser(userId)
    .then((user) => res.status(200).json(user[0]))
    .catch(next);
});

router.post("/recommend", verifyToken, (req, res, next) => {
  try {
    const suggestBy = req.user.userId; // from token
    const suggestTo = req.body.user_id; // from body
    const tripId = req.body.tripId;
    const templateId = req.body.templateId || null;
    const customName = req.body.customName || null;
    recommendPackingItem(suggestBy, suggestTo, tripId, templateId, customName)
      .then((newRecommendation) => res.status(201).json(newRecommendation))
      .catch(next);
  } catch (err) {
    next(err);
  }
});

router.put(
  "/recommend/reject/:recommendationId",
  verifyToken,
  (req, res, next) => {
    const userId = req.user.userId;
    const recommendationId = req.params.recommendationId;
    rejectPackingListRecommendation(recommendationId, userId)
      .then((recommendation) => {
        res.status(200).json(recommendation);
      })
      .catch(next);
  }
);

router.put(
  "/recommend/approve/:recommendationId",
  verifyToken,
  (req, res, next) => {
    const userId = req.user.userId;
    const recommendationId = req.params.recommendationId;
    approvePackingListRecommendation(recommendationId, userId)
      .then((recommendation) => {
        res.status(200).json(recommendation);
      })
      .catch(next);
  }
);

router.get("/recommend/:tripId", verifyToken, (req, res, next) => {
  const userId = req.user.userId;
  const tripId = req.params.tripId;
  getPackingListRecommendation(tripId, userId)
    .then((recommendation) => {
      res.status(200).json(recommendation);
    })
    .catch(next);
});

module.exports = router;
