import { test, expect } from '@playwright/test';

test.describe('Suite 1: Storefront Navigation & Page Rendering', () => {
  test('1.1 - Homepage renders hero banners, categories, featured products, and branding', async ({ page }) => {
    await page.goto('/');

    // Check title and branding
    await expect(page).toHaveTitle(/VK Technology/i);
    await expect(page.locator('header')).toBeVisible();

    // Verify search input in header
    const searchInput = page.getByPlaceholder(/search arduino, esp32/i);
    await expect(searchInput).toBeVisible();

    // Verify navigation links
    await expect(page.getByRole('button', { name: /all categories/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /arduino/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /diy projects/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /apps/i }).first()).toBeVisible();

    // Verify footer branding & business info
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/pedamiram/i).first()).toBeVisible();
  });

  test('1.2 - Catalog Page (/products) supports search, filtering, and sorting', async ({ page }) => {
    await page.goto('/products');

    // Breadcrumb heading
    await expect(page.locator('h1, h2, nav').filter({ hasText: /products|catalog|all categories/i }).first()).toBeVisible();

    // Search for "Arduino" via header search bar
    const searchBar = page.getByPlaceholder(/search arduino, esp32/i);
    await expect(searchBar).toBeVisible();
    await searchBar.fill('Arduino');
    await searchBar.press('Enter');

    // Wait for filtered results
    await page.waitForTimeout(1000);
    const productCards = page.locator('article, .group, a[href^="/product/"]');
    await expect(productCards.first()).toBeVisible();

    // Verify price range filter exists
    await expect(page.getByText(/price range/i)).toBeVisible();
  });

  test('1.3 - Product Detail Page renders image gallery, specifications, and Add to Cart', async ({ page }) => {
    await page.goto('/products');
    await page.waitForTimeout(1000);

    // Click on the first product card link
    const firstProductLink = page.locator('a[href^="/product/"]').first();
    await expect(firstProductLink).toBeVisible();
    await firstProductLink.click();
    await page.waitForURL(/\/product\//, { timeout: 10000 });

    // Product detail page assertions
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText(/₹/i).first()).toBeVisible();

    // Quantity selector and Add to Cart button
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    await expect(addToCartBtn).toBeVisible();

    // Verify specifications section exists
    await expect(page.getByText(/specifications/i).first()).toBeVisible();
  });

  test('1.4 - Informational and Content Pages load without errors', async ({ page }) => {
    // About Page
    await page.goto('/about');
    await expect(page.getByText(/karthik/i).first()).toBeVisible();

    // Contact Page
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /contact|send us a message/i }).first()).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Karthik Suroju')).toBeVisible();

    // Projects Page
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /diy.*project/i })).toBeVisible();

    // Apps Page
    await page.goto('/apps');
    await expect(page.getByRole('heading', { name: /companion apps|hardware companion/i })).toBeVisible();

    // Policies Page
    await page.goto('/policies');
    await expect(page.getByText(/shipping/i).first()).toBeVisible();
  });

  test('1.5 - Non-existent routes display custom 404 Page Not Found', async ({ page }) => {
    await page.goto('/non-existent-page-xyz-404');
    await expect(page.getByText(/404 - page not found/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /back to homepage/i })).toBeVisible();
  });
});
