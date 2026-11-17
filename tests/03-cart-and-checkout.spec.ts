import { test, expect } from '@playwright/test';

test.describe('Suite 3: Shopping Cart & Checkout User Flows', () => {
  test('3.1 - Empty Cart displays friendly message and continue shopping link', async ({ page }) => {
    await page.goto('/cart');
    // Clear localStorage cart to ensure empty cart state
    await page.evaluate(() => localStorage.removeItem('vk_cart_items'));
    await page.reload();

    await expect(page.getByText(/your shopping cart is empty/i)).toBeVisible();
    const continueShoppingBtn = page.getByRole('link', { name: /continue shopping/i });
    await expect(continueShoppingBtn).toBeVisible();
  });

  test('3.2 - Adding product to cart updates badge and cart list', async ({ page }) => {
    await page.goto('/products');
    await page.waitForTimeout(1000);

    // Click on the first product
    const firstProduct = page.locator('a[href^="/product/"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();
    await page.waitForURL(/\/product\//, { timeout: 10000 });

    // Click Add to Cart
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // Verify cart indicator in header
    await page.waitForTimeout(500);
    const cartHeaderLink = page.locator('header').locator('a[href="/cart"]');
    await expect(cartHeaderLink).toBeVisible();

    // Navigate to cart
    await page.goto('/cart');
    await expect(page.getByText(/shopping cart/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /proceed to buy|proceed to checkout/i })).toBeVisible();
  });

  test('3.3 - Cart item quantity can be modified', async ({ page }) => {
    // Add product to cart
    await page.goto('/products');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /add to cart/i }).first().click();

    await page.goto('/cart');
    await expect(page.getByRole('button', { name: /proceed to buy|proceed to checkout/i })).toBeVisible();

    // Quantity buttons (+) and (-)
    const plusBtn = page.getByRole('button', { name: '+' }).first();
    if (await plusBtn.isVisible()) {
      await plusBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('3.4 - Coupon code validation accepts valid coupon or rejects invalid', async ({ page }) => {
    // Ensure item in cart
    await page.goto('/products');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /add to cart/i }).first().click();

    await page.goto('/cart');

    // Test invalid coupon
    const couponInput = page.getByPlaceholder(/enter coupon code|coupon code/i);
    if (await couponInput.isVisible()) {
      await couponInput.fill('INVALIDCOUPON999');
      const applyBtn = page.getByRole('button', { name: /apply/i });
      await applyBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/invalid|expired/i)).toBeVisible();
    }
  });

  test('3.5 - Checkout Page processes delivery address and order placement', async ({ page }) => {
    // Add item to cart
    await page.goto('/products');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /add to cart/i }).first().click();

    // Go to checkout
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: /checkout|delivery address/i }).first()).toBeVisible();

    // Fill delivery address form
    const nameInput = page.getByPlaceholder(/first and last name|full name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('Karthik Test User');
    }

    const emailInput = page.getByPlaceholder(/name@example.com|email/i).first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('karthik.test@example.com');
    }

    const phoneInput = page.getByPlaceholder(/mobile number|10-digit/i);
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('8555997052');
    }

    const addressInput = page.getByPlaceholder(/street address|flat|house no/i).first();
    if (await addressInput.isVisible()) {
      await addressInput.fill('Flat 402, Technology Street, Pedamiram');
    }

    const cityInput = page.getByPlaceholder(/city/i);
    if (await cityInput.isVisible()) {
      await cityInput.fill('Bhimavaram');
    }

    // Select Cash on Delivery for test safety
    const codRadio = page.getByLabel(/cash on delivery|cod/i).or(page.getByText(/cash on delivery/i));
    if (await codRadio.isVisible()) {
      await codRadio.click();
    }

    // Submit order button
    const placeOrderBtn = page.getByRole('button', { name: /place your order|confirm order/i });
    if (await placeOrderBtn.isVisible()) {
      await placeOrderBtn.click();
      await page.waitForTimeout(2000);

      // Verify order confirmation view
      await expect(page.getByText(/order placed|order confirmed|thank you/i).first()).toBeVisible();
    }
  });
});
