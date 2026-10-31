import { test, expect } from '@playwright/test';

const SEEDED_ARCH_BOARD_ID = 'cmvwobcv100042d27hrlvahy9';
const SEEDED_VIEWER_TOKEN = 'seed-viewer-token-public-readonly';

test.describe('Multi-Device Responsive Layout & Non-Expiring Image Proxy E2E', () => {
  test('verifies zero horizontal overflow and zero control overlap across Mobile (375x667), Tablet (768x1024), and Desktop (1440x900)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();

    const landingOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(landingOverflow).toBe(false);

    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@whiteboard.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/boards/);

    const boardsMobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(boardsMobileOverflow).toBe(false);

    await page.goto(`/board/${SEEDED_ARCH_BOARD_ID}`);
    await expect(page.locator('canvas').first()).toBeVisible();

    for (const vp of [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(vp);
      const layoutCheck = await page.evaluate(() => {
        const vw = window.innerWidth;
        const header = document.querySelector('header')?.getBoundingClientRect();
        const boxes = Array.from(
          document.querySelectorAll('div.absolute.bottom-4, div.absolute.bottom-16'),
        ).map((el) => el.getBoundingClientRect());

        const headerFits = header
          ? header.left >= -2 && header.right <= vw + 2
          : false;
        let overlap = false;
        if (boxes.length >= 2) {
          const [a, b] = boxes;
          overlap = !(
            a.right < b.left ||
            a.left > b.right ||
            a.bottom < b.top ||
            a.top > b.bottom
          );
        }
        return { headerFits, overlap };
      });
      expect(layoutCheck.headerFits).toBe(true);
      expect(layoutCheck.overlap).toBe(false);
    }
  });

  test('uploads an image, serves binary PNG via non-expiring BFF endpoint, and enforces Read-Only Share Link permissions', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@whiteboard.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/boards/);

    await page.goto(`/board/${SEEDED_ARCH_BOARD_ID}`);
    await expect(page.locator('canvas').first()).toBeVisible();

    const uploadResult = await page.evaluate(async () => {
      const win = window as unknown as {
        __CANVAS_ENGINE__?: {
          insertImage: (file: File, pt: { x: number; y: number }) => Promise<void>;
          getAllElements: () => Array<{
            id: string;
            type: string;
            src?: string;
            assetId?: string;
          }>;
          deleteElements: (ids: string[]) => void;
        };
      };
      for (let i = 0; i < 20; i++) {
        if (win.__CANVAS_ENGINE__) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      const engine = win.__CANVAS_ENGINE__;
      if (!engine) throw new Error('CanvasEngine not initialized');

      const offscreen = document.createElement('canvas');
      offscreen.width = 64;
      offscreen.height = 64;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, 64, 64);
      }
      const blob = await new Promise<Blob | null>((resolve) =>
        offscreen.toBlob(resolve, 'image/png'),
      );
      if (!blob) throw new Error('Failed to create PNG blob');

      const file = new File([blob], 'e2e-check.png', { type: 'image/png' });
      await engine.insertImage(file, { x: 600, y: 300 });

      const img = engine.getAllElements().find((e) => e.type === 'image');
      if (!img?.src) throw new Error('Image element not created');

      const resp = await fetch(img.src);
      const bytes = new Uint8Array(await resp.arrayBuffer());
      const isPng =
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47;

      engine.deleteElements([img.id]);
      return {
        src: img.src,
        status: resp.status,
        contentType: resp.headers.get('content-type'),
        isPng,
      };
    });

    expect(uploadResult.src).toMatch(
      /^\/api\/v1\/boards\/cmvwobcv100042d27hrlvahy9\/assets\/.+\.png\/view$/,
    );
    expect(uploadResult.status).toBe(200);
    expect(uploadResult.contentType).toBe('image/png');
    expect(uploadResult.isPng).toBe(true);

    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto(
      `/board/${SEEDED_ARCH_BOARD_ID}?token=${SEEDED_VIEWER_TOKEN}`,
    );
    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(
      page.locator('header').getByText(/Read-Only|Somente Leitura/i),
    ).toBeVisible();
  });
});
