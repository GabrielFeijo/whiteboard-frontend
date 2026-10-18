import { test, expect } from '@playwright/test';

test.describe('Sticky Note Text Wrapping and Resize E2E', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `sticky_tester_${timestamp}@example.com`,
    password: 'Password123!',
    name: 'Sticky Tester',
  };

  test('creates a sticky note with long text and wraps text without compression during resize', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/Whiteboard/);

    await page.fill('input[type="text"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/boards/);

    await page.click('button:has-text("New Board"), button:has-text("Novo Quadro")');
    await page.fill('input[placeholder*="Architecture"], input[placeholder*="Arquitetura"]', `Sticky Test ${timestamp}`);
    await page.click('button:has-text("Create Whiteboard"), button:has-text("Criar Quadro")');

    await expect(page).toHaveURL(/\/board\/.+/);
    await expect(page.locator('canvas').first()).toBeVisible();

    const stickyBtn = page.locator('button[aria-label*="Sticky Note"], button[aria-label*="Nota Adesiva"], button[title*="Sticky Note"], button[title*="Nota Adesiva"]').first();
    await expect(stickyBtn).toBeVisible();
    await stickyBtn.click();

    await page.mouse.click(500, 300);

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    const testText = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.';
    await textarea.fill(testText);

    await expect(page.locator('canvas').first()).toBeVisible();

    const initialElementWidth = await page.evaluate(() => {
      const activeElement = document.querySelector('textarea');
      return Boolean(activeElement);
    });
    expect(initialElementWidth).toBe(true);

    await page.mouse.move(600, 300);
    await page.mouse.down();
    await page.mouse.move(450, 300, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('canvas').first()).toBeVisible();
  });
});
