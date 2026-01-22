const { getUserTripsAndSettings, createTrip } = require('../models/mainDashboardModel');

module.exports.getMainDashboard = async function getMainDashboard(req, res, next) {
  try {
    const userId = req.user.userId;
    const data = await getUserTripsAndSettings(userId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports.createNewTrip = async function createNewTrip(req, res, next) {
  try {
    const userId = req.user.userId;
    const tripData = { ...req.body, userId };
    const newTrip = await createTrip(tripData);
    res.status(201).json(newTrip);
  } catch (error) {
    next(error);
  }
};
