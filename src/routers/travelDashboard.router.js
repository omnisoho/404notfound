const express = require('express');
const { getTravelDashboardController } = require('../controller/travelDashboard');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/:tripName', requireAuth, getTravelDashboardController);

module.exports = router;
