const express = require('express');
const { getMainDashboard, createNewTrip } = require('../controller/mainDashboard');
const { verifyToken } = require('../middleware/auth.middleware');
const router = express.Router();

router.get('/', verifyToken, getMainDashboard);
router.post('/create', verifyToken, createNewTrip);

module.exports = router;
