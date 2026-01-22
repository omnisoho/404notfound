const express = require('express');
const router = express.Router();
const budgetPlannerController = require('../controller/budgetPlanner');

// Trip Details
router.post('/trip-details', budgetPlannerController.saveTripDetails);
router.get('/trip-details', budgetPlannerController.getTripDetails);

// Budget
router.post('/budget', budgetPlannerController.saveBudget);
router.get('/budget', budgetPlannerController.getBudget);

// Expenses
router.post('/expenses', budgetPlannerController.saveExpenses);
router.get('/expenses', budgetPlannerController.getExpenses);

// Categories
router.post('/distribute-budget', budgetPlannerController.distributeBudget);
router.post('/normalize-percentages', budgetPlannerController.normalizePercentages);
router.post('/custom-categories', budgetPlannerController.saveCustomCategories);

// Currency
router.post('/format-currency', budgetPlannerController.formatCurrency);

// Auto-categorization
router.post('/auto-categorize-expense', budgetPlannerController.autoCategorizeExpense);

// Alerts
router.post('/check-thresholds', budgetPlannerController.checkThresholds);

// Activities
router.post('/load-activities', budgetPlannerController.loadActivities);
router.post('/optimize-activities', budgetPlannerController.optimizeActivities);

// Budget Calculation
router.post('/calculate-daily-budget', budgetPlannerController.calculateDailyBudget);

module.exports = router;
