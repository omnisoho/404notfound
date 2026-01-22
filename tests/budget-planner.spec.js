const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/budgetPlanner');
});

test.describe('Budget Planner - Category Management', () => {
  test('Should display buffer category with edit and lock buttons', async ({ page }) => {
    // Check if buffer category row exists
    const bufferRow = page.locator('[data-category="buffer"]');
    await expect(bufferRow).toBeVisible();

    // Check if edit and lock buttons exist for buffer
    const bufferEditBtn = bufferRow.locator('#bufferEditBtn');
    const bufferLockBtn = bufferRow.locator('#bufferLockBtn');
    await expect(bufferEditBtn).toBeVisible();
    await expect(bufferLockBtn).toBeVisible();
  });

  test('Should update percentage when edit button is clicked for buffer', async ({ page }) => {
    const bufferRow = page.locator('[data-category="buffer"]');
    const bufferEditBtn = bufferRow.locator('#bufferEditBtn');
    const bufferValue = bufferRow.locator('#bufferValue');

    // Set a total budget first
    const totalBudgetInput = page.locator('#totalBudget');
    if (await totalBudgetInput.isVisible()) {
      await totalBudgetInput.fill('10000');
    }

    // Click edit button and enter new percentage
    page.on('dialog', async dialog => {
      await dialog.accept('10');
    });
    await bufferEditBtn.click();

    // Check if percentage is updated
    await expect(bufferValue).toContainText('10%');
  });

  test('Should enforce minimum 10% for buffer category', async ({ page }) => {
    const bufferRow = page.locator('[data-category="buffer"]');
    const bufferEditBtn = bufferRow.locator('#bufferEditBtn');
    const bufferValue = bufferRow.locator('#bufferValue');

    // Set total budget
    const totalBudgetInput = page.locator('#totalBudget');
    if (await totalBudgetInput.isVisible()) {
      await totalBudgetInput.fill('10000');
    }

    // Try to set buffer below minimum (less than 10%)
    page.on('dialog', async dialog => {
      await dialog.accept('5');
    });
    await bufferEditBtn.click();

    // Should automatically adjust to minimum 10%
    await expect(bufferValue).toContainText('10%');
  });

  test('Should handle invalid input gracefully in edit dialog', async ({ page }) => {
    const bufferRow = page.locator('[data-category="buffer"]');
    const bufferEditBtn = bufferRow.locator('#bufferEditBtn');
    const bufferValue = bufferRow.locator('#bufferValue');

    // Click edit button and enter invalid input
    page.on('dialog', async dialog => {
      await dialog.accept('invalid');
    });
    await bufferEditBtn.click();

    // Should remain unchanged
    await expect(bufferValue).toContainText('15%'); // default value
  });

  test('Should normalize other categories when buffer percentage changes', async ({ page }) => {
    // Set total budget
    const totalBudgetInput = page.locator('#totalBudget');
    if (await totalBudgetInput.isVisible()) {
      await totalBudgetInput.fill('10000');
    }

    // Get initial values for other categories
    const foodRow = page.locator('[data-category="food"]');
    const foodValue = foodRow.locator('#foodValue');

    // Record initial food percentage
    const initialFoodPercentage = await foodValue.textContent();

    // Change buffer percentage
    const bufferRow = page.locator('[data-category="buffer"]');
    const bufferEditBtn = bufferRow.locator('#bufferEditBtn');
    page.on('dialog', async dialog => {
      await dialog.accept('20');
    });
    await bufferEditBtn.click();

    // Check if food percentage was adjusted (normalized)
    const newFoodPercentage = await foodValue.textContent();
    expect(newFoodPercentage).not.toBe(initialFoodPercentage);
  });

  test('Should work with lock buttons', async ({ page }) => {
    const bufferRow = page.locator('[data-category="buffer"]');
    const bufferLockBtn = bufferRow.locator('#bufferLockBtn');

    // Test lock functionality
    await bufferLockBtn.click();
    // Lock state should be applied (button text changes)
    await expect(bufferLockBtn).toContainText('Unlock');
  });

  test('Should handle edge case: percentage exceeding 100%', async ({ page }) => {
    const bufferRow = page.locator('[data-category="buffer"]');
    const bufferEditBtn = bufferRow.locator('#bufferEditBtn');
    const bufferValue = bufferRow.locator('#bufferValue');

    // Try to set buffer percentage higher than 100%
    page.on('dialog', async dialog => {
      await dialog.accept('150');
    });
    await bufferEditBtn.click();

    // Should be capped at 100%
    await expect(bufferValue).toContainText('100%');
  });
});
