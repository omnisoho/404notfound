const express = require('express');
const { listActivities } = require('../controller/activity.controller');

const router = express.Router();

router.get('/', listActivities);

module.exports = router;
