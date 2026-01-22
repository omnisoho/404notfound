// Budget Planner Application
class BudgetPlanner {
    constructor() {
        this.state = {
            destination: {
                country: '',
                city: ''
            },
            tripDetails: {
                startDate: '',
                endDate: '',
                days: 7,
                travelers: 2,
                tripType: 'normal'
            },
            currency: {
                selected: 'SGD',
                rates: {}
            },
            budget: {
                total: 5000,
                recommended: 0
            },
            expenses: [],
            countries: [],
            cities: [],
            // Budget categories for chart and sliders
            categories: {
                accommodation: { percentage: 30, color: '#1e3a5f', label: 'Accommodation' },
                food: { percentage: 25, color: '#f59e0b', label: 'Food' },
                shopping: { percentage: 15, color: '#8b5cf6', label: 'Shopping' },
                attractions: { percentage: 15, color: '#ef4444', label: 'Attractions' },
                transport: { percentage: 10, color: '#10b981', label: 'Transport' },
                buffer: { percentage: 5, color: '#6b7280', label: 'Emergency Buffer' }
            }
        };

        this.chart = null;

        // Country to currency mapping
        this.countryToCurrency = {
            'Singapore': 'SGD',
            'Malaysia': 'MYR',
            'Thailand': 'THB',
            'Indonesia': 'IDR',
            'Vietnam': 'VND',
            'Philippines': 'PHP',
            'Cambodia': 'KHR',
            'Myanmar': 'MMK',
            'Laos': 'LAK',
            'Brunei': 'BND',
            'Japan': 'JPY',
            'South Korea': 'KRW',
            'China': 'CNY',
            'Taiwan': 'TWD',
            'Hong Kong': 'HKD',
            'India': 'INR',
            'Sri Lanka': 'LKR',
            'Nepal': 'NPR',
            'Bangladesh': 'BDT',
            'Pakistan': 'PKR',
            'United Arab Emirates': 'AED',
            'Saudi Arabia': 'SAR',
            'Qatar': 'QAR',
            'Oman': 'OMR',
            'Jordan': 'JOD',
            'United Kingdom': 'GBP',
            'Germany': 'EUR',
            'France': 'EUR',
            'Italy': 'EUR',
            'Spain': 'EUR',
            'Netherlands': 'EUR',
            'Switzerland': 'CHF',
            'Austria': 'EUR',
            'Belgium': 'EUR',
            'Sweden': 'SEK',
            'Norway': 'NOK',
            'Denmark': 'DKK',
            'Finland': 'EUR',
            'Ireland': 'EUR',
            'Portugal': 'EUR',
            'United States': 'USD',
            'Canada': 'CAD',
            'Mexico': 'MXN',
            'Australia': 'AUD',
            'New Zealand': 'NZD',
            'South Africa': 'ZAR',
            'Egypt': 'EGP',
            'Morocco': 'MAD',
            'Kenya': 'KES',
            'Tanzania': 'TZS',
            'Brazil': 'BRL',
            'Argentina': 'ARS',
            'Chile': 'CLP',
            'Peru': 'PEN',
            'Colombia': 'COP'
        };

        this.init();
    }

    async init() {
        // Try to load from backend first, fallback to localStorage
        const loadedFromBackend = await this.loadFromBackend();

        await Promise.all([
            this.loadCountries(),
            this.loadCurrencyRates()
        ]);
        this.setupEventListeners();
        this.populateCityDropdown();
        this.updateUI();
        this.renderExpenses();

        // Initialize chart and categories after DOM is ready
        setTimeout(() => {
            this.initChart();
            this.renderCategories();
        }, 100);

        // If we loaded from backend, sync to localStorage as backup
        if (loadedFromBackend) {
            this.saveToLocalStorage();
        }
    }

    setupEventListeners() {
        // Destination selectors
        document.getElementById('countrySelect').addEventListener('change', async (e) => {
            this.state.destination.country = e.target.value;

            // Auto-change currency based on country
            const newCurrency = this.countryToCurrency[this.state.destination.country];
            if (newCurrency && newCurrency !== this.state.currency.selected) {
                this.state.currency.selected = newCurrency;
                // Update currency dropdown
                const currencySelect = document.getElementById('currency');
                if (currencySelect) {
                    currencySelect.value = newCurrency;
                }
            } else if (!this.state.destination.country) {
                // Reset currency to Select Currency if no country selected
                this.state.currency.selected = '';
                const currencySelect = document.getElementById('currency');
                if (currencySelect) {
                    currencySelect.value = '';
                }
            }

            this.populateCityDropdown();
            this.calculateRecommendedBudget();
            await this.saveToBackend();
            this.updateUI();
        });

        document.getElementById('citySelect').addEventListener('change', async (e) => {
            this.state.destination.city = e.target.value;
            await this.saveToBackend();
            this.updateUI();
        });

        // Date inputs
        document.getElementById('startDate').addEventListener('change', async (e) => {
            this.state.tripDetails.startDate = e.target.value;
            this.calculateDays();
            this.calculateRecommendedBudget();
            await this.saveToBackend();
            this.updateUI();
        });

        document.getElementById('endDate').addEventListener('change', async (e) => {
            this.state.tripDetails.endDate = e.target.value;
            this.calculateDays();
            this.calculateRecommendedBudget();
            await this.saveToBackend();
            this.updateUI();
        });

        // Trip details
        document.getElementById('travelers').addEventListener('input', async (e) => {
            this.state.tripDetails.travelers = parseInt(e.target.value) || 2;
            this.calculateRecommendedBudget();
            await this.saveToBackend();
            this.updateUI();
        });

        document.getElementById('tripType').addEventListener('change', async (e) => {
            this.state.tripDetails.tripType = e.target.value;
            this.calculateRecommendedBudget();
            await this.saveToBackend();
            this.updateUI();
        });

        document.getElementById('currency').addEventListener('change', async (e) => {
            if (e.target.value) {
                this.state.currency.selected = e.target.value;
                await this.loadCurrencyRates();
                await this.saveToBackend();
                this.updateUI();
                await this.updateCategoryDisplays();
            }
        });

        document.getElementById('totalBudget').addEventListener('input', async (e) => {
            this.state.budget.total = parseFloat(e.target.value) || 0;
            this.updateBudgetStatus();
            this.updateUI();
            await this.updateCategoryDisplays();
            await this.saveToBackend();
        });

        // Add expense
        document.getElementById('addExpenseBtn').addEventListener('click', () => {
            this.addExpense();
        });

        // Activity recommendations
        document.getElementById('loadActivitiesBtn').addEventListener('click', async () => {
            await this.loadActivities();
            document.getElementById('activitySection').style.display = 'block';
        });

        document.getElementById('optimizeActivitiesBtn').addEventListener('click', async () => {
            await this.optimizeActivities();
        });

        // Enter key for expense input
        document.getElementById('expenseAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addExpense();
            }
        });

        // Expense currency change
        document.getElementById('expenseCurrency').addEventListener('change', (e) => {
            this.updateSGDEquivalent();
        });

        // Expense amount input
        document.getElementById('expenseAmount').addEventListener('input', (e) => {
            this.updateSGDEquivalent();
        });

        // Set default expense date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;


    }

    // Chart and Category Functions
    initChart() {
        const ctx = document.getElementById('budgetChart');
        if (!ctx) return;

        const chartData = {
            labels: Object.values(this.state.categories).map(cat => cat.label),
            datasets: [{
                data: Object.values(this.state.categories).map(cat => cat.percentage),
                backgroundColor: Object.values(this.state.categories).map(cat => cat.color),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed;
                                const amount = (this.state.budget.total * value / 100);
                                return `${context.label}: ${value.toFixed(1)}% (${this.formatCurrency(amount)})`;
                            }
                        }
                    }
                }
            }
        });
    }

    async renderCategories() {
        const container = document.getElementById('budgetCategories');
        if (!container) return;

        container.innerHTML = '';

        // Use existing categories

        Object.keys(this.state.categories).forEach(key => {
            const cat = this.state.categories[key];
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'bg-canvas border border-border p-4';
            categoryDiv.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-4 h-4 rounded-full" style="background-color: ${cat.color};"></div>
                        <span class="font-medium text-ink">${cat.label}</span>
                    </div>
                    <div class="text-right">
                        <div class="font-semibold text-ink" id="amount-${key}">S$ 0</div>
                        <div class="text-sm text-muted" id="percentage-${key}">0%</div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-muted">0%</span>
                    <input type="range" min="0" max="100" value="${cat.percentage}" step="0.01"
                           class="percentage-slider flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-navy"
                           data-category="${key}">
                    <span class="text-xs text-muted">100%</span>
                </div>
            `;
            container.appendChild(categoryDiv);
        });

        // Setup slider listeners
        document.querySelectorAll('.percentage-slider').forEach(slider => {
            slider.addEventListener('input', async (e) => {
                const category = e.target.dataset.category;
                this.state.categories[category].percentage = parseFloat(e.target.value);
                this.normalizePercentages(category);
                await this.updateCategoryDisplays();
                this.updateChart();
                await this.saveToBackend();
            });
        });

        await this.updateCategoryDisplays();
    }

    normalizePercentages(changedKey) {
        // Local normalization logic only
        const total = Object.values(this.state.categories).reduce((sum, cat) => sum + cat.percentage, 0);

        if (total > 100) {
            const excess = total - 100;
            const otherKeys = Object.keys(this.state.categories).filter(k => k !== changedKey);
            const otherTotal = otherKeys.reduce((sum, k) => sum + this.state.categories[k].percentage, 0);

            if (otherTotal > 0) {
                otherKeys.forEach(key => {
                    const reduction = (this.state.categories[key].percentage / otherTotal) * excess;
                    this.state.categories[key].percentage = Math.max(0, this.state.categories[key].percentage - reduction);
                    const slider = document.querySelector(`.percentage-slider[data-category="${key}"]`);
                    if (slider) slider.value = this.state.categories[key].percentage;
                });
            }
        } else if (total < 100) {
            const deficit = 100 - total;
            this.state.categories.buffer.percentage = Math.min(100, this.state.categories.buffer.percentage + deficit);
            const slider = document.querySelector('.percentage-slider[data-category="buffer"]');
            if (slider) slider.value = this.state.categories.buffer.percentage;
        }
    }

    async updateCategoryDisplays() {
        for (const key of Object.keys(this.state.categories)) {
            const cat = this.state.categories[key];
            const amount = (this.state.budget.total * cat.percentage / 100);

            const amountEl = document.getElementById(`amount-${key}`);
            const percentageEl = document.getElementById(`percentage-${key}`);

            if (amountEl) amountEl.textContent = await this.formatCurrency(amount);
            if (percentageEl) percentageEl.textContent = cat.percentage.toFixed(1) + '%';
        }
    }

    updateChart() {
        if (!this.chart) return;
        
        this.chart.data.datasets[0].data = Object.values(this.state.categories).map(cat => cat.percentage);
        this.chart.update();
    }

    async formatCurrency(amount) {
        try {
            const response = await this.apiRequest('/format-currency', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    currency: this.state.currency.selected || 'SGD'
                })
            });
            return response.formatted;
        } catch (error) {
            console.warn('Failed to format currency with backend, using local formatter:', error);
            // Fallback to local formatting
            const currency = this.state.currency.selected || 'SGD';
            const convertedAmount = this.convertFromBase(amount, currency);

            const formatter = new Intl.NumberFormat('en-SG', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });

            return formatter.format(convertedAmount);
        }
    }

    updateUI() {
        // Update displays - default to SGD if no country selected or currency is empty
        let currency = this.state.currency.selected;
        if (!currency || !this.state.currency.rates[currency] || !this.state.destination.country) {
            currency = 'SGD';
            if (!this.state.destination.country) {
                this.state.currency.selected = '';
            } else {
                this.state.currency.selected = currency;
            }
        }
        const formatter = new Intl.NumberFormat('en-SG', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

        document.getElementById('totalBudgetDisplay').textContent = formatter.format(this.convertFromBase(this.state.budget.total, currency));

        const totalSpent = this.state.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('totalSpentDisplay').textContent = formatter.format(this.convertFromBase(totalSpent, currency));

        const remaining = this.state.budget.total - totalSpent;
        document.getElementById('remainingDisplay').textContent = formatter.format(this.convertFromBase(remaining, currency));

        // Check alerts
        this.checkAlerts();
    }

    async addExpense() {
        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const expenseDate = document.getElementById('expenseDate').value;
        const expenseCurrency = document.getElementById('expenseCurrency').value;
        const traveller = document.getElementById('expenseTraveller').value.trim();

        if (!description || isNaN(amount) || amount <= 0) {
            alert('Please enter a valid description and amount');
            return;
        }

        // Convert amount to SGD base
        const sgdAmount = expenseCurrency ? this.convertToBase(amount, expenseCurrency) : amount;

        const expense = {
            id: Date.now(),
            description,
            amount: sgdAmount,
            category: category || this.autoCategorize(description),
            date: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
            originalAmount: amount,
            originalCurrency: expenseCurrency || 'SGD',
            traveller: traveller || null
        };

        this.state.expenses.push(expense);
        await this.saveToBackend();

        // Clear inputs
        document.getElementById('expenseDescription').value = '';
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseTraveller').value = '';
        document.getElementById('sgdEquivalent').textContent = '';

        this.renderExpenses();
        this.updateUI();
    }

    async autoCategorize(description) {
        try {
            const response = await this.apiRequest('/auto-categorize-expense', {
                method: 'POST',
                body: JSON.stringify({ description })
            });
            return response.category;
        } catch (error) {
            console.warn('Failed to auto-categorize with backend, using local logic:', error);
            // Fallback to local categorization
            const desc = description.toLowerCase();
            const keywords = {
                accommodation: ['hotel', 'hostel', 'bnb', 'stay', 'room'],
                food: ['restaurant', 'food', 'meal', 'lunch', 'dinner', 'cafe', 'eat'],
                shopping: ['shop', 'mall', 'store', 'buy', 'purchase'],
                attractions: ['museum', 'park', 'tour', 'ticket', 'show'],
                transport: ['taxi', 'bus', 'train', 'flight', 'metro', 'uber']
            };

            for (const [cat, words] of Object.entries(keywords)) {
                if (words.some(word => desc.includes(word))) {
                    return cat;
                }
            }
            return 'buffer';
        }
    }

    renderExpenses() {
        const container = document.getElementById('expensesList');
        if (!container) return;
        container.innerHTML = '';

        const currency = this.state.currency.selected || 'SGD';
        const formatter = new Intl.NumberFormat('en-SG', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

        this.state.expenses.slice(-10).reverse().forEach(expense => {
            const displayAmount = expense.originalAmount && expense.originalCurrency
                ? this.convertFromBase(expense.amount, currency)
                : this.convertFromBase(expense.amount, currency);

            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
            div.innerHTML = `
                <div>
                    <div class="font-medium">${expense.description}</div>
                    <div class="text-sm text-gray-500 capitalize">${expense.category}${expense.traveller ? ` • ${expense.traveller}` : ''}</div>
                    <div class="text-xs text-gray-400">${new Date(expense.date).toLocaleDateString()}</div>
                </div>
                <div class="text-right">
                    <div class="font-semibold">${formatter.format(displayAmount)}</div>
                    ${expense.originalAmount && expense.originalCurrency && expense.originalCurrency !== currency
                        ? `<div class="text-xs text-gray-500">${expense.originalCurrency} ${expense.originalAmount.toFixed(2)}</div>`
                        : ''}
                </div>
            `;
            container.appendChild(div);
        });
    }

    async checkAlerts() {
        try {
            const response = await this.apiRequest('/check-thresholds', {
                method: 'POST',
                body: JSON.stringify({
                    budget: this.state.budget,
                    expenses: this.state.expenses
                })
            });

            const container = document.getElementById('alertsContainer');
            if (!container) return;
            container.innerHTML = '';

            if (response.alerts && response.alerts.length > 0) {
                response.alerts.forEach(alert => {
                    this.showAlert(alert.message, alert.type);
                });
            }
        } catch (error) {
            console.warn('Failed to check thresholds with backend, using local logic:', error);
            // Fallback to local alerts
            const container = document.getElementById('alertsContainer');
            if (!container) return;
            container.innerHTML = '';

            const totalSpent = this.state.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const remaining = this.state.budget.total - totalSpent;

            if (remaining < 0) {
                this.showAlert('You have exceeded your budget!', 'error');
            } else if (remaining < this.state.budget.total * 0.1) {
                this.showAlert('You are running low on budget. Consider reducing expenses.', 'warning');
            }
        }
    }

    async loadActivities() {
        try {
            const response = await this.apiRequest('/load-activities', {
                method: 'POST',
                body: JSON.stringify({
                    tripDetails: this.state.tripDetails
                })
            });

            if (response.activities) {
                this.state.activities = response.activities;
                this.renderActivityRecommendations();
            }
        } catch (error) {
            console.warn('Failed to load activities from backend:', error);
            // Fallback to local activity recommendations if needed
        }
    }

    async optimizeActivities() {
        try {
            const response = await this.apiRequest('/optimize-activities', {
                method: 'POST',
                body: JSON.stringify({
                    activities: this.state.activities,
                    budget: this.state.budget,
                    tripDetails: this.state.tripDetails
                })
            });

            if (response.selectedActivities) {
                this.state.selectedActivities = response.selectedActivities;
                this.renderActivityRecommendations(response.selectedActivities);
            }
        } catch (error) {
            console.warn('Failed to optimize activities from backend:', error);
            // Fallback to local optimization if needed
        }
    }

    renderActivityRecommendations(selectedIds = []) {
        const container = document.getElementById('activityRecommendations');
        if (!container || !this.state.activities) return;

        container.innerHTML = '';

        this.state.activities.forEach(activity => {
            const isSelected = selectedIds.includes(activity.id);
            const activityDiv = document.createElement('div');
            activityDiv.className = `p-4 rounded-lg shadow-sm border ${isSelected ? 'bg-green-50 border-green-300' : 'bg-white'}`;
            activityDiv.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-ink">${activity.name} ${isSelected ? '✓' : ''}</h4>
                        <p class="text-sm text-muted">${activity.description}</p>
                        <div class="mt-2 flex items-center gap-4">
                            <span class="text-sm text-ink">${this.formatCurrency(activity.cost)}</span>
                            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${activity.category}</span>
                        </div>
                    </div>
                    <button class="add-activity-btn ${isSelected ? 'bg-green-600 hover:bg-green-700' : 'bg-navy hover:bg-navy-dark'} text-white px-3 py-1 rounded text-sm"
                            data-activity-id="${activity.id}">
                        ${isSelected ? 'Selected' : 'Add to Budget'}
                    </button>
                </div>
            `;
            container.appendChild(activityDiv);
        });

        // Add event listeners for add buttons
        document.querySelectorAll('.add-activity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activityId = e.target.dataset.activityId;
                this.addActivityToBudget(activityId);
            });
        });
    }

    addActivityToBudget(activityId) {
        const activity = this.state.activities.find(a => a.id === activityId);
        if (!activity) return;

        // Add as expense
        const expense = {
            id: Date.now(),
            description: activity.name,
            amount: this.convertToBase(activity.cost, this.state.currency.selected || 'SGD'),
            category: 'attractions',
            date: new Date().toISOString(),
            originalAmount: activity.cost,
            originalCurrency: this.state.currency.selected || 'SGD',
            traveller: null
        };

        this.state.expenses.push(expense);
        this.saveToBackend();
        this.renderExpenses();
        this.updateUI();
    }

    showAlert(message, type) {
        const container = document.getElementById('alertsContainer');
        const alert = document.createElement('div');
        alert.className = `p-4 rounded-lg ${type === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`;
        alert.textContent = message;
        container.appendChild(alert);
    }

    // API Helper Methods
    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`/api${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`API request to ${endpoint} failed:`, error);
            throw error;
        }
    }

    async saveToBackend() {
        try {
            // Save trip details
            if (this.state.destination.country || this.state.tripDetails.startDate) {
                await this.apiRequest('/trip-details', {
                    method: 'POST',
                    body: JSON.stringify({
                        destination: this.state.destination,
                        ...this.state.tripDetails
                    })
                });
            }

            // Save budget
            if (this.state.budget.total > 0) {
                await this.apiRequest('/budget', {
                    method: 'POST',
                    body: JSON.stringify({
                        total: this.state.budget.total,
                        recommended: this.state.budget.recommended,
                        categories: this.state.categories
                    })
                });
            }



            // Save expenses
            if (this.state.expenses.length > 0) {
                await this.apiRequest('/expenses', {
                    method: 'POST',
                    body: JSON.stringify(this.state.expenses)
                });
            }

            console.log('Data saved to backend successfully');
        } catch (error) {
            console.warn('Failed to save to backend, falling back to localStorage:', error);
            this.saveToLocalStorage();
        }
    }

    async loadFromBackend() {
        try {
            // Load trip details
            const tripData = await this.apiRequest('/trip-details');
            if (tripData) {
                this.state.destination = tripData.destination || this.state.destination;
                this.state.tripDetails = { ...this.state.tripDetails, ...tripData };
                delete this.state.tripDetails.destination; // Remove duplicate
            }

            // Load budget
            const budgetData = await this.apiRequest('/budget');
            if (budgetData) {
                this.state.budget = { ...this.state.budget, ...budgetData };
                if (budgetData.categories) {
                    this.state.categories = { ...this.state.categories, ...budgetData.categories };
                }
            }

            // Load expenses
            const expenses = await this.apiRequest('/expenses');
            if (expenses) {
                this.state.expenses = expenses;
            }

            console.log('Data loaded from backend successfully');
            return true;
        } catch (error) {
            console.warn('Failed to load from backend, falling back to localStorage:', error);
            this.loadFromLocalStorage();
            return false;
        }
    }

    saveToLocalStorage() {
        try {
            const stateToSave = JSON.parse(JSON.stringify(this.state));
            localStorage.setItem('budgetPlannerState', JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    async loadCountries() {
        try {
            const response = await fetch('https://countriesnow.space/api/v0.1/countries/population/cities');
            const data = await response.json();
            if (data.data) {
                // Filter out invalid entries
                const validData = data.data.filter(item =>
                    item.country &&
                    item.country !== 'footnoteSeqID' &&
                    item.country !== '13' &&
                    typeof item.country === 'string' &&
                    item.country.trim().length > 0 &&
                    !/^\d+$/.test(item.country)
                );

                this.state.countriesRaw = validData;
                const countrySet = new Set(validData.map(item => item.country));
                this.state.countries = Array.from(countrySet).sort();

                this.populateCountryDropdown();
            }
        } catch (error) {
            console.error('Failed to load countries:', error);
        }
    }

    populateCountryDropdown() {
        const countrySelect = document.getElementById('countrySelect');
        if (!countrySelect) return;

        countrySelect.innerHTML = '<option value="">Select Country</option>';
        this.state.countries.forEach(countryName => {
            const option = document.createElement('option');
            option.value = countryName;
            option.textContent = countryName;
            countrySelect.appendChild(option);
        });
    }

    populateCityDropdown() {
        const citySelect = document.getElementById('citySelect');
        if (!citySelect) return;

        citySelect.innerHTML = '<option value="">Select City</option>';

        if (!this.state.destination.country) {
            citySelect.disabled = true;
            return;
        }

        citySelect.disabled = false;
        const citiesForCountry = this.state.countriesRaw
            .filter(item => item.country === this.state.destination.country)
            .map(item => item.city)
            .filter(city => city);

        if (citiesForCountry.length > 0) {
            const uniqueCities = [...new Set(citiesForCountry)].sort();
            uniqueCities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }
    }

    async loadCurrencyRates() {
        try {
            const response = await fetch(`https://api.exchangerate-api.com/v4/latest/SGD`);
            const data = await response.json();
            this.state.currency.rates = data.rates;
            this.populateCurrencyDropdown();
        } catch (error) {
            console.error('Failed to load currency rates:', error);
        }
    }

    populateCurrencyDropdown() {
        const currencySelect = document.getElementById('currency');
        if (!currencySelect) return;

        currencySelect.innerHTML = '<option value="">Select Currency</option>';
        const currencies = Object.keys(this.state.currency.rates).sort();
        currencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency;
            option.textContent = currency;
            if (currency === this.state.currency.selected) {
                option.selected = true;
            }
            currencySelect.appendChild(option);
        });
    }

    convertFromBase(amount, targetCurrency) {
        if (!this.state.currency.rates[targetCurrency]) return amount;
        return amount * this.state.currency.rates[targetCurrency];
    }

    convertToBase(amount, sourceCurrency) {
        if (!this.state.currency.rates[sourceCurrency]) return amount;
        return amount / this.state.currency.rates[sourceCurrency];
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('budgetPlannerState');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(this.state, parsed);
                // Ensure categories is always a valid object
                if (!this.state.categories || typeof this.state.categories !== 'object' || Object.keys(this.state.categories).length === 0) {
                    this.state.categories = {
                        accommodation: { percentage: 30, color: '#1e3a5f', label: 'Accommodation' },
                        food: { percentage: 25, color: '#f59e0b', label: 'Food' },
                        shopping: { percentage: 15, color: '#8b5cf6', label: 'Shopping' },
                        attractions: { percentage: 15, color: '#ef4444', label: 'Attractions' },
                        transport: { percentage: 10, color: '#10b981', label: 'Transport' },
                        buffer: { percentage: 5, color: '#6b7280', label: 'Emergency Buffer' }
                    };
                }
            } catch (e) {
                console.error('Failed to load saved data:', e);
            }
        }
    }

    calculateDays() {
        if (this.state.tripDetails.startDate && this.state.tripDetails.endDate) {
            const start = new Date(this.state.tripDetails.startDate);
            const end = new Date(this.state.tripDetails.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            this.state.tripDetails.days = diffDays;

            const daysInput = document.getElementById('tripDays');
            if (daysInput) {
                daysInput.value = diffDays;
            }
        }
    }

    async calculateRecommendedBudget() {
        const { destination, tripDetails } = this.state;

        if (!destination.country || !tripDetails.startDate || !tripDetails.endDate) {
            this.state.budget.recommended = 0;
            return;
        }

        try {
            const response = await this.apiRequest('/calculate-daily-budget', {
                method: 'POST',
                body: JSON.stringify({
                    budget: this.state.budget,
                    tripDetails
                })
            });

            if (response.dailyBudget) {
                // Calculate total recommended budget from daily budget
                const totalRecommended = response.dailyBudget * tripDetails.days * tripDetails.travelers;
                this.state.budget.recommended = Math.round(totalRecommended);
            }
        } catch (error) {
            console.warn('Failed to calculate recommended budget with backend, using local logic:', error);
            // Fallback to local calculation
            const regionalCosts = {
                'Singapore': 150, 'Malaysia': 120, 'Thailand': 100, 'Indonesia': 90, 'Vietnam': 80, 'Philippines': 85,
                'Cambodia': 70, 'Myanmar': 65, 'Laos': 60, 'Brunei': 140,
                'Japan': 180, 'South Korea': 160, 'China': 130, 'Taiwan': 140, 'Hong Kong': 200,
                'India': 75, 'Sri Lanka': 70, 'Nepal': 55, 'Bangladesh': 50, 'Pakistan': 60,
                'United Arab Emirates': 220, 'Saudi Arabia': 190, 'Qatar': 250, 'Oman': 170, 'Jordan': 120,
                'United Kingdom': 250, 'Germany': 200, 'France': 220, 'Italy': 190, 'Spain': 180,
                'Netherlands': 210, 'Switzerland': 280, 'Austria': 200, 'Belgium': 190, 'Sweden': 230,
                'Norway': 260, 'Denmark': 240, 'Finland': 220, 'Ireland': 200, 'Portugal': 160,
                'United States': 280, 'Canada': 220, 'Mexico': 120,
                'Australia': 240, 'New Zealand': 200,
                'South Africa': 140, 'Egypt': 100, 'Morocco': 90, 'Kenya': 110, 'Tanzania': 95,
                'Brazil': 130, 'Argentina': 110, 'Chile': 120, 'Peru': 100, 'Colombia': 95,
                'default': 120
            };

            const baseCostPerDay = regionalCosts[destination.country] || regionalCosts['default'];

            const tripTypeMultipliers = {
                'budget': 0.7,
                'normal': 1.0,
                'luxury': 1.8
            };

            const adjustedCostPerDay = baseCostPerDay * tripTypeMultipliers[tripDetails.tripType];
            const recommendedPerPerson = adjustedCostPerDay * tripDetails.days;
            const recommendedTotal = recommendedPerPerson * tripDetails.travelers;

            this.state.budget.recommended = Math.round(recommendedTotal);
        }

        const recommendedInput = document.getElementById('recommendedBudget');
        if (recommendedInput) {
            recommendedInput.value = this.state.budget.recommended;
        }

        this.updateBudgetStatus();
    }

    updateBudgetStatus() {
        const statusDiv = document.getElementById('budgetStatus');
        if (!statusDiv) return;

        const { total, recommended } = this.state.budget;

        if (recommended === 0) {
            statusDiv.textContent = 'Set dates to calculate';
            statusDiv.className = 'w-full px-4 py-3 border border-border bg-canvas text-ink text-center font-medium';
            return;
        }

        if (total === 0) {
            statusDiv.textContent = 'Enter your budget';
            statusDiv.className = 'w-full px-4 py-3 border border-border bg-canvas text-ink text-center font-medium';
            return;
        }

        const difference = ((total - recommended) / recommended) * 100;
        const absDifference = Math.abs(difference);

        if (absDifference < 5) {
            statusDiv.textContent = 'Perfect match!';
            statusDiv.className = 'w-full px-4 py-3 border border-green-300 bg-green-50 text-green-800 text-center font-medium';
        } else if (difference > 0) {
            statusDiv.textContent = `+${absDifference.toFixed(0)}% above recommendation`;
            statusDiv.className = 'w-full px-4 py-3 border border-blue-300 bg-blue-50 text-blue-800 text-center font-medium';
        } else {
            statusDiv.textContent = `${absDifference.toFixed(0)}% below recommendation`;
            statusDiv.className = 'w-full px-4 py-3 border border-orange-300 bg-orange-50 text-orange-800 text-center font-medium';
        }
    }

    updateSGDEquivalent() {
        const amountInput = document.getElementById('expenseAmount');
        const currencySelect = document.getElementById('expenseCurrency');
        const sgdEquivalentDiv = document.getElementById('sgdEquivalent');

        if (!amountInput || !currencySelect || !sgdEquivalentDiv) return;

        const amount = parseFloat(amountInput.value);
        const selectedCurrency = currencySelect.value;

        if (isNaN(amount) || amount <= 0 || !selectedCurrency) {
            sgdEquivalentDiv.textContent = '';
            return;
        }

        const sgdAmount = this.convertToBase(amount, selectedCurrency);
        sgdEquivalentDiv.textContent = `≈ SGD ${sgdAmount.toFixed(2)}`;
    }


}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new BudgetPlanner();
});