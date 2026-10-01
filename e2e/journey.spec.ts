import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Full login → upload → dashboard journey. Skips unless a test user is
// provided (locally via env, in CI via workflow_dispatch secrets).
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set');

function makeStatementXlsx(): string {
  const rows = [
    ['Date', 'Narration', 'Withdrawal Amt.', 'Deposit Amt.'],
    ['2026-08-01', 'E2E Salary credit', '', '50000'],
    ['2026-08-02', 'E2E Grocery store', '2500', ''],
    ['2026-08-03', 'E2E Electricity bill', '1200', ''],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Statement');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-')), 'statement.xlsx');
  XLSX.writeFile(workbook, file);
  return file;
}

test('login → upload statement → dashboard shows transactions', async ({ page }) => {
  await test.step('log in via the sidebar auth modal', async () => {
    await page.goto('./');
    await page.locator('aside').getByTitle('Login').click();
    await page.getByLabel(/email address/i).fill(EMAIL!);
    await page.getByLabel(/password/i).fill(PASSWORD!);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    // Modal closes on success; sidebar then shows the account avatar.
    await expect(page.getByLabel(/email address/i)).toBeHidden({ timeout: 15_000 });
  });

  await test.step('upload a statement on the finance page', async () => {
    await page.locator('aside').getByTitle('Finance').click();
    await expect(page.getByText(/upload your transaction file/i)).toBeVisible();
    const statement = makeStatementXlsx();
    await page.locator('#transaction-list, main').locator('input[type="file"]').first().setInputFiles(statement);
    // Staging modal lists parsed rows; confirm to persist.
    await expect(page.getByText('E2E Salary credit')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /confirm|import|save/i }).first().click();
  });

  await test.step('dashboard lists the uploaded transactions', async () => {
    await expect(page.getByText('E2E Grocery store')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('E2E Electricity bill')).toBeVisible();
  });
});
