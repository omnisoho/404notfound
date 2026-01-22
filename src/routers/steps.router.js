const express = require('express');
const router = express.Router();
const { saveStepsController } = require('../controller/steps.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// Save steps for a specific date
router.post('/:tripName/steps', requireAuth, saveStepsController);

module.exports = router;
