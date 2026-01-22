const { saveSteps } = require('../models/steps.model');

async function saveStepsController(req, res) {
  try {
    const { tripName } = req.params;
    const { date, steps } = req.body;
    const userId = req.user.userId;

    console.log('💾 Saving steps:', { tripName, date, steps, userId });

    // Validate input
    if (!date || steps === undefined || steps === null) {
      return res.status(400).json({
        success: false,
        message: 'Date and steps are required',
      });
    }

    if (isNaN(steps) || steps < 0) {
      return res.status(400).json({
        success: false,
        message: 'Steps must be a non-negative number',
      });
    }

    // Save the steps data with date validation
    const result = await saveSteps(userId, tripName, date, parseInt(steps, 10));

    console.log('✅ Steps saved successfully:', result);

    res.status(200).json({
      success: true,
      message: 'Steps saved successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in saveStepsController:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save steps',
    });
  }
}

module.exports = {
  saveStepsController,
};
