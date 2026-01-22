const createError = require('http-errors');
const { getTravelDashboard } = require('../models/travelDashboard.model');

async function getTravelDashboardController(req, res, next) {
  const { tripName } = req.params;
  const userId = req.user.userId;

  if (!tripName) {
    return next(createError(400, 'tripName is required'));
  }

  try {
    const dashboard = await getTravelDashboard(tripName, userId);
    return res.json(dashboard);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getTravelDashboardController,
};
