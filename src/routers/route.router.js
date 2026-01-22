const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getRouteToActivity, getRouteToCustom } = require("../controller/route.controller");

const router = express.Router();

router.get("/activity/:activityId", requireAuth, getRouteToActivity);
router.post("/custom", requireAuth, getRouteToCustom);

module.exports = router;
