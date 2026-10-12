import { test, expect } from '@playwright/test';

test.describe('Real-Time Whiteboard E2E', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `alice_${timestamp}@example.com`,
    password: 'Password123!',
    name: 'Alice Cooper',
  };

  test('user authentication, dashboard, and whiteboard studio navigation', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/Whiteboard/);

    await page.fill('input[type="text"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/boards/);
    await expect(page.locator('h1')).toContainText('My Whiteboards');

    await page.click('button:has-text("New Board")');
    await page.fill('input[placeholder="e.g. System Architecture Diagram"]', `Architecture Plan ${timestamp}`);
    await page.click('button:has-text("Create Whiteboard")');

    const boardCard = page.locator(`h3:has-text("Architecture Plan ${timestamp}")`);
    await expect(boardCard).toBeVisible();
    await boardCard.click();

    await expect(page).toHaveURL(/\/board\/.+/);

    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(page.locator('button[title*="Select"]')).toBeVisible();
    await expect(page.locator('button[title*="Rectangle"]')).toBeVisible();
    await expect(page.locator('button[title*="Sticky Note"]')).toBeVisible();
    await expect(page.locator('button[title*="Export Canvas"]')).toBeVisible();
  });
});
