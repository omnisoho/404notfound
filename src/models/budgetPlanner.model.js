const createError = require('http-errors');
const prisma = require('./prismaClient');

// Backend API configuration
const API_BASE_URL = 'http://localhost:3000/api';

let exchangeRates = {};

// API Methods
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Trip Details Methods
async function saveTripDetails(tripDetails) {
    try {
        await apiRequest('/trip-details', {
            method: 'POST',
            body: JSON.stringify(tripDetails)
        });
        return { success: true };
    } catch (error) {
        console.warn('Failed to save trip details to backend');
        return { success: false, error: error.message };
    }
}

async function loadTripDetails() {
    try {
        const data = await apiRequest('/trip-details');
        return data;
    } catch (error) {
        console.warn('Failed to load trip details from backend');
        return null;
    }
}

// Budget Methods
async function saveBudget(budget) {
    try {
        await apiRequest('/budget', {
            method: 'POST',
            body: JSON.stringify(budget)
        });
        return { success: true };
    } catch (error) {
        console.warn('Failed to save budget to backend');
        return { success: false, error: error.message };
    }
}

async function loadBudget() {
    try {
        const data = await apiRequest('/budget');
        return data;
    } catch (error) {
        console.warn('Failed to load budget from backend');
        return null;
    }
}

// Expense Methods
async function saveExpenses(expenses) {
    try {
        await apiRequest('/expenses', {
            method: 'POST',
            body: JSON.stringify(expenses)
        });
        return { success: true };
    } catch (error) {
        console.warn('Failed to save expenses to backend');
        return { success: false, error: error.message };
    }
}

async function loadExpenses() {
    try {
        const data = await apiRequest('/expenses');
        return data || [];
    } catch (error) {
        console.warn('Failed to load expenses from backend');
        return [];
    }
}

// Custom Categories Methods
async function saveCustomCategories(customCategories) {
    try {
        await apiRequest('/custom-categories', {
            method: 'POST',
            body: JSON.stringify(customCategories)
        });
        return { success: true };
    } catch (error) {
        console.warn('Failed to save custom categories to backend');
        return { success: false, error: error.message };
    }
}

async function loadCustomCategories() {
    try {
        const data = await apiRequest('/custom-categories');
        return data || [];
    } catch (error) {
        console.warn('Failed to load custom categories from backend');
        return [];
    }
}

// Business Logic Methods
function calculateDailyBudget(budget, tripDetails) {
    const { total, categories } = budget;
    const { days, travelers } = tripDetails;

    const allocatedBudget = Object.keys(categories)
        .filter(key => key !== 'buffer')
        .reduce((sum, key) => sum + (total * categories[key].percentage / 100), 0);

    const dailyBudget = allocatedBudget / days / travelers;
    return dailyBudget;
}

function distributeBudget(budget) {
    const { total, categories } = budget;
    Object.keys(categories).forEach(key => {
        categories[key].amount = total * categories[key].percentage / 100;
    });
    return categories;
}

function autoCategorizeExpense(description) {
    const desc = description.toLowerCase();
    const keywords = {
        accommodation: ['hotel', 'hostel', 'airbnb', 'bnb', 'stay', 'room', 'lodging'],
        food: ['restaurant', 'food', 'meal', 'lunch', 'dinner', 'breakfast', 'cafe', 'eat'],
        shopping: ['shop', 'mall', 'store', 'buy', 'purchase', 'gift', 'souvenir'],
        attractions: ['museum', 'park', 'tour', 'ticket', 'show', 'attraction', 'sightseeing'],
        transport: ['taxi', 'uber', 'bus', 'train', 'flight', 'metro', 'subway', 'transport']
    };

    for (const [category, words] of Object.entries(keywords)) {
        if (words.some(word => desc.includes(word))) {
            return category;
        }
    }
    return 'other';
}

function checkThresholds(budget, expenses) {
    const alerts = [];
    if (!budget || !budget.categories || !budget.total) {
        return alerts; // Return empty alerts if budget data is incomplete
    }

    const { categories, total } = budget;
    const totalSpent = expenses ? expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) : 0;

    if (!categories || typeof categories !== 'object') {
        return alerts; // Return empty alerts if categories is not a valid object
    }

    Object.keys(categories).forEach(key => {
        const category = categories[key];
        if (!category || typeof category.percentage !== 'number') return;

        const categoryBudget = total * (category.percentage / 100);
        const spentInCategory = expenses
            ? expenses
                .filter(exp => exp && exp.category === key)
                .reduce((sum, exp) => sum + (exp.amount || 0), 0)
            : 0;

        if (categoryBudget > 0) {
            const utilization = (spentInCategory / categoryBudget) * 100;
            if (utilization > 90) {
                alerts.push({
                    type: 'error',
                    message: `${category.label || key} budget is ${utilization.toFixed(1)}% used. Consider reducing spending.`
                });
            } else if (utilization > 75) {
                alerts.push({
                    type: 'warning',
                    message: `${category.label || key} budget is ${utilization.toFixed(1)}% used.`
                });
            }
        }
    });

    const today = new Date().toDateString();
    const spentToday = expenses
        .filter(exp => new Date(exp.date).toDateString() === today)
        .reduce((sum, exp) => sum + exp.amount, 0);

    const dailyBudget = calculateDailyBudget(budget, { days: 7, travelers: 2 }); // Default values
    if (spentToday > dailyBudget * 1.2) {
        alerts.push({
            type: 'warning',
            message: `You've spent ${formatCurrency(spentToday, budget.currency)} today, exceeding your daily budget by ${(spentToday / dailyBudget * 100 - 100).toFixed(1)}%.`
        });
    }

    const remainingBudget = total - totalSpent;
    if (remainingBudget < total * 0.1) {
        alerts.push({
            type: 'error',
            message: `Only ${formatCurrency(remainingBudget, budget.currency)} remaining in total budget.`
        });
    }

    return alerts;
}

function knapsackActivitySelection(activities, budget) {
    const n = activities.length;
    const dp = Array(n + 1).fill().map(() => Array(budget + 1).fill(0));
    const selected = Array(n + 1).fill().map(() => Array(budget + 1).fill([]));

    for (let i = 1; i <= n; i++) {
        const activity = activities[i - 1];
        for (let w = 0; w <= budget; w++) {
            if (activity.cost <= w) {
                const include = dp[i - 1][w - activity.cost] + activity.value;
                const exclude = dp[i - 1][w];
                if (include > exclude) {
                    dp[i][w] = include;
                    selected[i][w] = [...selected[i - 1][w - activity.cost], activity.id];
                } else {
                    dp[i][w] = exclude;
                    selected[i][w] = [...selected[i - 1][w]];
                }
            } else {
                dp[i][w] = dp[i - 1][w];
                selected[i][w] = [...selected[i - 1][w]];
            }
        }
    }
    return selected[n][budget];
}

function loadActivities(tripDetails) {
    const activitiesByDestination = {
        tokyo: [
            { id: 1, name: 'Tokyo Skytree', costSGD: 20, value: 85, category: 'attractions', description: 'Iconic tower with panoramic views' },
            { id: 2, name: 'Senso-ji Temple', costSGD: 0, value: 70, category: 'attractions', description: 'Ancient Buddhist temple in Asakusa' },
            { id: 3, name: 'Shibuya Crossing', costSGD: 0, value: 60, category: 'attractions', description: 'World-famous pedestrian scramble' },
            { id: 4, name: 'Tsukiji Fish Market', costSGD: 15, value: 75, category: 'food', description: 'Fresh seafood and sushi experience' },
            { id: 5, name: 'Ginza Shopping', costSGD: 50, value: 80, category: 'shopping', description: 'Luxury shopping district' },
            { id: 6, name: 'Shinjuku Gyoen Park', costSGD: 5, value: 65, category: 'attractions', description: 'Beautiful national garden' }
        ],
        paris: [
            { id: 1, name: 'Eiffel Tower', costSGD: 30, value: 95, category: 'attractions', description: 'Iconic iron lattice tower' },
            { id: 2, name: 'Louvre Museum', costSGD: 17, value: 90, category: 'attractions', description: 'World\'s largest art museum' },
            { id: 3, name: 'Seine River Cruise', costSGD: 15, value: 80, category: 'attractions', description: 'Scenic boat tour' },
            { id: 4, name: 'Montmartre District', costSGD: 0, value: 75, category: 'attractions', description: 'Artistic hilltop neighborhood' },
            { id: 5, name: 'Champs-Élysées', costSGD: 0, value: 70, category: 'shopping', description: 'Famous avenue for shopping' },
            { id: 6, name: 'Palace of Versailles', costSGD: 20, value: 85, category: 'attractions', description: 'Opulent royal residence' }
        ],
        default: [
            { id: 1, name: 'City Museum', costSGD: 15, value: 75, category: 'attractions', description: 'Local history and culture' },
            { id: 2, name: 'Central Park Visit', costSGD: 0, value: 60, category: 'attractions', description: 'Relax in the city\'s green space' },
            { id: 3, name: 'Local Food Tour', costSGD: 25, value: 80, category: 'food', description: 'Taste authentic local cuisine' },
            { id: 4, name: 'Market Shopping', costSGD: 20, value: 70, category: 'shopping', description: 'Browse local markets' },
            { id: 5, name: 'Bus Tour', costSGD: 30, value: 85, category: 'attractions', description: 'See all major sights' },
            { id: 6, name: 'Night Market', costSGD: 10, value: 65, category: 'food', description: 'Evening street food experience' }
        ]
    };

    const destination = tripDetails.destination || 'default';
    const baseActivities = activitiesByDestination[destination] || activitiesByDestination.default;

    return baseActivities.map(activity => ({
        ...activity,
        cost: convertCurrency(activity.costSGD, 'SGD', tripDetails.currency || 'SGD')
    }));
}

// Utility Methods
function formatCurrency(amount, currency = 'SGD') {
    const symbols = {
        SGD: 'S$', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CNY: '¥', MYR: 'RM'
    };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
}

function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) return amount;
    const amountInSGD = amount / exchangeRates[fromCurrency];
    return amountInSGD * exchangeRates[toCurrency];
}

function optimizeActivities(activities, budget, tripDetails) {
    // Use knapsack algorithm to select optimal activities within budget
    const selectedIds = knapsackActivitySelection(activities, budget);
    return selectedIds;
}

function normalizePercentages(budget, changedKey) {
    const keys = Object.keys(budget.categories);
    let total = keys.reduce((s, k) => s + budget.categories[k].percentage, 0);

    const minPercents = { accom: 0, food: 0, shop: 0, attr: 0, trans: 0, buffer: 10 };
    const maxPercent = 100;

    if (Math.abs(total - 100) < 0.0001) {
        return budget.categories;
    }

    if (total > 100) {
        let excess = total - 100;
        const otherKeys = keys.filter(k => k !== changedKey);
        let reducible = otherKeys.reduce((sum, k) => sum + Math.max(0, budget.categories[k].percentage - (minPercents[k] || 0)), 0);

        if (reducible <= 0) {
            budget.categories[changedKey].percentage = Math.max((minPercents[changedKey] || 0), budget.categories[changedKey].percentage - excess);
        } else {
            otherKeys.forEach(k => {
                const avail = Math.max(0, budget.categories[k].percentage - (minPercents[k] || 0));
                const reduction = (avail / reducible) * excess;
                budget.categories[k].percentage = Math.max((minPercents[k] || 0), budget.categories[k].percentage - reduction);
            });
        }
    } else if (total < 100) {
        let deficit = 100 - total;
        const otherKeys = keys.filter(k => k !== changedKey);
        let increasable = otherKeys.reduce((sum, k) => sum + Math.max(0, maxPercent - budget.categories[k].percentage), 0);

        if (increasable <= 0) {
            budget.categories[changedKey].percentage = Math.min(maxPercent, budget.categories[changedKey].percentage + deficit);
        } else {
            otherKeys.forEach(k => {
                const cap = Math.max(0, maxPercent - budget.categories[k].percentage);
                const addition = (cap / increasable) * deficit;
                budget.categories[k].percentage = Math.min(maxPercent, budget.categories[k].percentage + addition);
            });
        }
    }

    keys.forEach(k => { budget.categories[k].percentage = Math.round(budget.categories[k].percentage * 100) / 100; });
    let finalTotal = keys.reduce((s, k) => s + budget.categories[k].percentage, 0);
    const diff = Math.round((100 - finalTotal) * 100) / 100;
    if (Math.abs(diff) >= 0.01) {
        const targetKey = keys.find(k => k !== changedKey) || changedKey;
        budget.categories[targetKey].percentage = Math.min(maxPercent, Math.max((minPercents[targetKey] || 0), budget.categories[targetKey].percentage + diff));
    }

    return budget.categories;
}

module.exports = {
    saveTripDetails,
    loadTripDetails,
    saveBudget,
    loadBudget,
    saveExpenses,
    loadExpenses,
    saveCustomCategories,
    loadCustomCategories,
    calculateDailyBudget,
    distributeBudget,
    autoCategorizeExpense,
    checkThresholds,
    knapsackActivitySelection,
    loadActivities,
    formatCurrency,
    convertCurrency,
    normalizePercentages,
    optimizeActivities
};
