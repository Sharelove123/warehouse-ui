import { expect, test, type Page } from '@playwright/test';

function requireEnv(name: string): string {
  const val = process.env[name]?.trim();
  if (!val) {
    throw new Error(
      `Missing required environment variable ${name} for Playwright evaluation tests.`
    );
  }
  return val;
}

function getEvalCredentials() {
  return {
    admin: {
      username: requireEnv('EVAL_ADMIN_USERNAME'),
      password: requireEnv('EVAL_ADMIN_PASSWORD'),
    },
    auditor: {
      username: requireEnv('EVAL_AUDITOR_USERNAME'),
      password: requireEnv('EVAL_AUDITOR_PASSWORD'),
    },
    technician: {
      username: requireEnv('EVAL_TECHNICIAN_USERNAME'),
      password: requireEnv('EVAL_TECHNICIAN_PASSWORD'),
    },
  };
}

async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByTestId('current-username')).toHaveText(username);
}

test.describe('Warehouse Management System E2E', () => {
  test('Auditor inspects 5x5 map, shuttle status, and 7-day dashboard (read-only)', async ({
    page,
  }) => {
    const creds = getEvalCredentials();
    await loginAs(page, creds.auditor.username, creds.auditor.password);

    await expect(page.getByTestId('current-user-role')).toHaveText('AUDITOR');
    await expect(page.getByTestId('cell-A1')).toContainText('TRANSFER');

    // All 25 cells exist on the grid
    await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(25);

    // Auditor cannot see Load Pallet button
    await expect(page.getByRole('button', { name: 'Load Pallet' })).toHaveCount(0);

    // Click an occupied cell if present and confirm read-only inspector
    const occupiedCells = page.locator('[data-status="occupied"]');
    const occupiedCount = await occupiedCells.count();
    if (occupiedCount > 0) {
      await occupiedCells.first().click();
      await expect(page.getByTestId('inspector-pallet-number')).toBeVisible();
      await expect(page.getByText(/Read-only access/i)).toBeVisible();
    }

    // Shuttle status page
    await page.getByRole('link', { name: 'Shuttle Status' }).click();
    await expect(page.getByTestId('shuttle-identifier')).toHaveText('SHUTTLE-01');
    await expect(page.getByTestId('shuttle-status')).toBeVisible();
    await expect(page.getByTestId('shuttle-battery')).toContainText('%');

    // Auditor dashboard
    await page.getByRole('link', { name: 'Auditor Dashboard' }).click();
    await expect(page.getByTestId('dash-occupied')).toBeVisible();
    await expect(page.getByTestId('dash-free')).toBeVisible();
    await expect(page.getByTestId('occupancy-chart').locator('svg').first()).toBeVisible();
    await expect(page.getByTestId('movements-page-info')).toContainText('Page 1 of');

    // Verify transfer activity action filter and search
    await page.getByLabel('Filter transfer action').selectOption('LOAD');
    await page.getByLabel('Search transfer activity').fill('PLT-1001');
    await expect(page.locator('[data-testid^="movement-row-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid^="movement-row-"]').first()).toContainText('PLT-1001');
  });

  test('Technician load, validation, 5s multi-session sync, and unload', async ({
    browser,
  }) => {
    const creds = getEvalCredentials();
    const techContext = await browser.newContext();
    const auditorContext = await browser.newContext();
    const techPage = await techContext.newPage();
    const auditorPage = await auditorContext.newPage();

    try {
      await loginAs(techPage, creds.technician.username, creds.technician.password);
      await loginAs(auditorPage, creds.auditor.username, creds.auditor.password);

      // Pick the first free cell dynamically
      const freeCell = techPage.locator('[data-status="free"]').first();
      const testId = await freeCell.getAttribute('data-testid');
      expect(testId).toBeTruthy();
      const targetCode = testId!.replace('cell-', '');

      const uniquePallet = `PLT-E2E-${Date.now()}`;
      await freeCell.click();
      await techPage
        .getByRole('button', { name: `Load Pallet into ${targetCode}` })
        .click();

      await techPage.getByLabel('Pallet number').fill(uniquePallet);
      await techPage.getByLabel('Barcode').fill('890999000123');
      await techPage.getByLabel('Item / product name').fill('E2E Test Servo Kit');
      await techPage.getByLabel('Quantity').fill('15');
      await techPage.getByRole('button', { name: 'Confirm Load' }).click();

      await expect(techPage.getByTestId(`cell-${targetCode}`)).toHaveAttribute(
        'data-status',
        'occupied'
      );
      await expect(techPage.getByTestId(`cell-${targetCode}`)).toContainText(
        uniquePallet
      );

      // Multi-session sync: Auditor sees the loaded pallet within 5 seconds without reload
      await expect(auditorPage.getByTestId(`cell-${targetCode}`)).toHaveAttribute(
        'data-status',
        'occupied',
        { timeout: 5500 }
      );
      await expect(auditorPage.getByTestId(`cell-${targetCode}`)).toContainText(
        uniquePallet,
        { timeout: 5500 }
      );

      // Validation check: reject duplicate active pallet number
      const anotherFree = techPage.locator('[data-status="free"]').first();
      if ((await anotherFree.count()) > 0) {
        await techPage.getByRole('button', { name: 'Load Pallet', exact: true }).click();
        await techPage.getByLabel('Pallet number').fill(uniquePallet);
        await techPage.getByLabel('Barcode').fill('890999000124');
        await techPage.getByLabel('Item / product name').fill('Duplicate Check');
        await techPage.getByLabel('Quantity').fill('2');
        await techPage.getByRole('button', { name: 'Confirm Load' }).click();
        await expect(techPage.getByRole('alert')).toContainText(/already stored/i);
        await techPage.getByRole('button', { name: 'Cancel' }).click();
      }

      // Unload the test pallet so state stays clean
      await techPage.getByTestId(`cell-${targetCode}`).click();
      await techPage
        .getByRole('button', { name: `Unload Pallet from ${targetCode}` })
        .click();

      await expect(techPage.getByTestId(`cell-${targetCode}`)).toHaveAttribute(
        'data-status',
        'free'
      );
      await expect(auditorPage.getByTestId(`cell-${targetCode}`)).toHaveAttribute(
        'data-status',
        'free',
        { timeout: 5500 }
      );
    } finally {
      await techContext.close();
      await auditorContext.close();
    }
  });

  test('Technician cannot access Auditor Dashboard or Admin Users', async ({
    page,
  }) => {
    const creds = getEvalCredentials();
    await loginAs(page, creds.technician.username, creds.technician.password);

    await expect(page.getByRole('link', { name: 'Auditor Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'User Admin' })).toHaveCount(0);

    await page.goto('/dashboard');
    await expect(page.getByText('Access Restricted')).toBeVisible();

    await page.goto('/admin/users');
    await expect(page.getByText('Admin Access Required')).toBeVisible();
  });

  test('Admin creates user, resets password, verifies login, and removes access', async ({
    page,
  }) => {
    const creds = getEvalCredentials();
    const tempUsername = `e2e_tech_${Date.now()}`;
    const initialPw = 'InitialTempPass123';
    const resetPw = 'ResetTempPass456';

    await loginAs(page, creds.admin.username, creds.admin.password);
    await page.getByRole('link', { name: 'User Admin' }).click();

    await page.getByLabel('Username').fill(tempUsername);
    await page.getByLabel('Password (min 6 chars)').fill(initialPw);
    await page.getByLabel('Role', { exact: true }).selectOption('TECHNICIAN');
    await page.getByRole('button', { name: 'Create User' }).click();

    const userRow = page.getByTestId(`user-row-${tempUsername}`);
    await expect(userRow).toBeVisible();

    await userRow.getByRole('button', { name: 'Reset Password' }).click();
    await page.getByLabel(/New Password/).fill(resetPw);
    await page.getByRole('button', { name: 'Save Password' }).click();
    await expect(page.getByRole('status')).toContainText('Password updated');

    // Verify the new user can sign in with the reset password
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAs(page, tempUsername, resetPw);
    await expect(page.getByTestId('current-user-role')).toHaveText('TECHNICIAN');

    // Log back in as admin and remove the temporary user
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAs(page, creds.admin.username, creds.admin.password);
    await page.getByRole('link', { name: 'User Admin' }).click();
    await page
      .getByTestId(`user-row-${tempUsername}`)
      .getByRole('button', { name: 'Remove' })
      .click();
    await expect(page.getByTestId(`user-row-${tempUsername}`)).toHaveCount(0);
  });
});
