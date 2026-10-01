import { test, expect } from '@playwright/test';

// No credentials needed: the landing shell must render offline of auth.
test('landing shell renders with navigation', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('main')).toBeVisible();
  // Sidebar collapsed icons expose titles.
  await expect(page.locator('aside').getByTitle('Finance')).toBeVisible();
  await expect(page.locator('aside').getByTitle('Login')).toBeVisible();
});

test('deep link to /finance renders without crashing', async ({ page }) => {
  await page.goto('./finance');
  await expect(page.getByRole('main')).toBeVisible();
});
