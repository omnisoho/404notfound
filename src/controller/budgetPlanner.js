const budgetPlannerModel = require('../models/budgetPlanner.model');

class BudgetPlannerController {
    // Trip Details
    async saveTripDetails(req, res) {
        try {
            const { destination, startDate, endDate, days, travelers, tripType } = req.body;
            const userId = req.user?.id;

            const tripData = {
                destination,
                startDate,
                endDate,
                days,
                travelers,
                tripType,
                userId
            };

            const result = await budgetPlannerModel.saveTripDetails(tripData);
            res.json(result);
        } catch (error) {
            console.error('Error saving trip details:', error);
            res.status(500).json({ error: 'Failed to save trip details' });
        }
    }

    async getTripDetails(req, res) {
        try {
            const userId = req.user?.id;
            const tripDetails = await budgetPlannerModel.getTripDetails(userId);
            res.json(tripDetails);
        } catch (error) {
            console.error('Error getting trip details:', error);
            res.status(500).json({ error: 'Failed to get trip details' });
        }
    }

    // Budget
    async saveBudget(req, res) {
        try {
            const { total, recommended, categories } = req.body;
            const userId = req.user?.id;

            const budgetData = {
                total,
                recommended,
                categories,
                userId
            };

            const result = await budgetPlannerModel.saveBudget(budgetData);
            res.json(result);
        } catch (error) {
            console.error('Error saving budget:', error);
            res.status(500).json({ error: 'Failed to save budget' });
        }
    }

    async getBudget(req, res) {
        try {
            const userId = req.user?.id;
            const budget = await budgetPlannerModel.getBudget(userId);
            res.json(budget);
        } catch (error) {
            console.error('Error getting budget:', error);
            res.status(500).json({ error: 'Failed to get budget' });
        }
    }

    // Expenses
    async saveExpenses(req, res) {
        try {
            const expenses = req.body;
            const userId = req.user?.id;

            const expensesWithUserId = expenses.map(expense => ({
                ...expense,
                userId
            }));

            const result = await budgetPlannerModel.saveExpenses(expensesWithUserId);
            res.json(result);
        } catch (error) {
            console.error('Error saving expenses:', error);
            res.status(500).json({ error: 'Failed to save expenses' });
        }
    }

    async getExpenses(req, res) {
        try {
            const userId = req.user?.id;
            const expenses = await budgetPlannerModel.getExpenses(userId);
            res.json(expenses);
        } catch (error) {
            console.error('Error getting expenses:', error);
            res.status(500).json({ error: 'Failed to get expenses' });
        }
    }

    // Categories
    async distributeBudget(req, res) {
        try {
            const { budget } = req.body;
            const categories = await budgetPlannerModel.distributeBudget(budget);
            res.json({ categories });
        } catch (error) {
            console.error('Error distributing budget:', error);
            res.status(500).json({ error: 'Failed to distribute budget' });
        }
    }

    async normalizePercentages(req, res) {
        try {
            const { budget, changedKey } = req.body;
            const categories = await budgetPlannerModel.normalizePercentages(budget, changedKey);
            res.json({ categories });
        } catch (error) {
            console.error('Error normalizing percentages:', error);
            res.status(500).json({ error: 'Failed to normalize percentages' });
        }
    }

    async saveCustomCategories(req, res) {
        try {
            const categories = req.body;
            const userId = req.user?.id;

            const result = await budgetPlannerModel.saveCustomCategories(categories, userId);
            res.json(result);
        } catch (error) {
            console.error('Error saving custom categories:', error);
            res.status(500).json({ error: 'Failed to save custom categories' });
        }
    }

    // Currency
    async formatCurrency(req, res) {
        try {
            const { amount, currency } = req.body;
            const formatted = await budgetPlannerModel.formatCurrency(amount, currency);
            res.json({ formatted });
        } catch (error) {
            console.error('Error formatting currency:', error);
            res.status(500).json({ error: 'Failed to format currency' });
        }
    }

    // Auto-categorization
    async autoCategorizeExpense(req, res) {
        try {
            const { description } = req.body;
            const category = await budgetPlannerModel.autoCategorizeExpense(description);
            res.json({ category });
        } catch (error) {
            console.error('Error auto-categorizing expense:', error);
            res.status(500).json({ error: 'Failed to auto-categorize expense' });
        }
    }

    // Alerts
    async checkThresholds(req, res) {
        try {
            const { budget, expenses } = req.body;
            const alerts = await budgetPlannerModel.checkThresholds(budget, expenses);
            res.json({ alerts });
        } catch (error) {
            console.error('Error checking thresholds:', error);
            res.status(500).json({ error: 'Failed to check thresholds' });
        }
    }

    // Activities
    async loadActivities(req, res) {
        try {
            const { tripDetails } = req.body;
            const activities = await budgetPlannerModel.loadActivities(tripDetails);
            res.json({ activities });
        } catch (error) {
            console.error('Error loading activities:', error);
            res.status(500).json({ error: 'Failed to load activities' });
        }
    }

    async optimizeActivities(req, res) {
        try {
            const { activities, budget, tripDetails } = req.body;
            const selectedActivities = await budgetPlannerModel.optimizeActivities(activities, budget, tripDetails);
            res.json({ selectedActivities });
        } catch (error) {
            console.error('Error optimizing activities:', error);
            res.status(500).json({ error: 'Failed to optimize activities' });
        }
    }

    // Budget Calculation
    async calculateDailyBudget(req, res) {
        try {
            const { budget, tripDetails } = req.body;
            const dailyBudget = await budgetPlannerModel.calculateDailyBudget(budget, tripDetails);
            res.json({ dailyBudget });
        } catch (error) {
            console.error('Error calculating daily budget:', error);
            res.status(500).json({ error: 'Failed to calculate daily budget' });
        }
    }
}

module.exports = new BudgetPlannerController();
