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
    await expect(page.getByRole('heading', { level: 1 }).last()).toBeVisible();

    await page.click('button:has-text("New Board"), button:has-text("Novo Quadro")');
    await page.fill('input[placeholder*="Architecture"], input[placeholder*="Arquitetura"]', `Architecture Plan ${timestamp}`);
    await page.click('button:has-text("Create Whiteboard"), button:has-text("Criar Quadro")');

    await expect(page).toHaveURL(/\/board\/.+/);

    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(page.locator('button[aria-label*="Select"], button[aria-label*="Selecionar"], button[title*="Select"], button[title*="Selecionar"]').first()).toBeVisible();
    await expect(page.locator('button[aria-label*="Rectangle"], button[aria-label*="Retângulo"], button[title*="Rectangle"], button[title*="Retângulo"]').first()).toBeVisible();
    await expect(page.locator('button[aria-label*="Sticky Note"], button[aria-label*="Nota Adesiva"], button[title*="Sticky Note"], button[title*="Nota Adesiva"]').first()).toBeVisible();
    await expect(page.locator('button[aria-label*="Export"], button[aria-label*="Exportar"], button[title*="Export"], button[title*="Exportar"]').first()).toBeVisible();
  });
});
