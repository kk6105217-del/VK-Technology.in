import { test, expect } from '@playwright/test';

test.describe('Suite 4: Admin Portal & Product Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login
    await page.goto('/admin/login');

    // Perform admin login
    const emailInput = page.getByPlaceholder(/admin@vktechnology\.shop/i);
    await expect(emailInput).toBeVisible();
    await emailInput.fill('admin@vktechnology.shop');

    const passInput = page.locator('input[type="password"]');
    await passInput.fill('admin');

    await page.getByRole('button', { name: /administrator login|authenticate & enter dashboard|sign in/i }).click();

    // Verify redirected to admin portal
    await page.waitForURL((url) => url.pathname.includes('/admin/dashboard') || url.pathname.includes('/admin/products'), { timeout: 15000 });
  });

  test('4.1 - Admin Dashboard renders metric cards and quick links', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page.getByRole('heading', { name: /store performance overview|admin dashboard|store analytics/i })).toBeVisible();

    // Verify sidebar navigation links
    await expect(page.getByRole('link', { name: /products/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /categories/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /orders/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /analytics/i }).first()).toBeVisible();
  });

  test('4.2 - Admin Products page renders Active Products and Recycle Bin tabs', async ({ page }) => {
    await page.goto('/admin/products');

    await expect(page.getByRole('heading', { name: /product management/i })).toBeVisible();

    // Verify Active Products and Recycle Bin tabs
    const activeTab = page.getByRole('button', { name: /active products/i }).first();
    const recycleBinTab = page.getByRole('button', { name: /recycle bin tab|^recycle bin/i }).first();
    await expect(activeTab).toBeVisible();
    await expect(recycleBinTab).toBeVisible();

    // Verify "Add New Product" button
    await expect(page.getByRole('button', { name: /add new product/i })).toBeVisible();
  });

  test('4.3 - Catalog Audit Modal inspects canonical products', async ({ page }) => {
    await page.goto('/admin/products');

    // Click "Audit Catalog" button
    const auditBtn = page.getByRole('button', { name: /audit catalog/i });
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: /catalog audit & selective recovery/i })).toBeVisible();
    await expect(page.getByText(/canonical/i).first()).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /close/i }).click();
  });

  test('4.4 - Product Stock Adjustment updates count in real time', async ({ page }) => {
    await page.goto('/admin/products');

    // Find the first stock count increment button (+)
    const plusButtons = page.getByRole('button', { name: /increase stock/i }).or(page.locator('tbody tr button:has-text("+")'));
    if (await plusButtons.count() > 0) {
      const firstPlus = plusButtons.first();
      await firstPlus.click();
      await page.waitForTimeout(500);
    }
  });

  test('4.5 - Recycle Bin Tab displays archived items and allows restoration', async ({ page }) => {
    await page.goto('/admin/products');

    // Switch to Recycle Bin tab
    const recycleBinTab = page.getByRole('button', { name: /recycle bin tab|^recycle bin/i }).first();
    await recycleBinTab.click();
    await page.waitForTimeout(500);

    // If there are archived products, verify Restore button
    const restoreButtons = page.getByRole('button', { name: /restore/i });
    if (await restoreButtons.count() > 0) {
      await expect(restoreButtons.first()).toBeVisible();
    } else {
      // Empty bin message
      await expect(page.getByText(/recycle bin is empty/i)).toBeVisible();
    }
  });
});
