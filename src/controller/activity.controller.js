const Activity = require('../models/activity.model');

async function listActivities(req, res, next) {
  try {
    const activities = await Activity.getAllActivities();
    res.json(activities);
  } catch (err) {
    console.error('Error fetching activities:', err);
    next(err); 
  }
}

module.exports = {
  listActivities,
};
