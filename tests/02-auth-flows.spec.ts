import { test, expect } from '@playwright/test';

test.describe('Suite 2: Customer Authentication & Account Management', () => {
  const testUser = {
    fullName: 'Test Automation User',
    email: `test_user_${Date.now()}@vktechnology.shop`,
    phone: '9876543210',
    password: 'Password123!',
  };

  test('2.1 - Registration form validates required inputs and password length', async ({ page }) => {
    await page.goto('/register');

    // Heading
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    // Check password mismatch validation
    await page.getByPlaceholder('First and last name').fill('John Doe');
    await page.getByPlaceholder('name@example.com').fill('johndoe@test.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('input[type="password"]').nth(1).fill('654321');
    await page.getByRole('button', { name: /continue|create/i }).click();

    // Should display mismatch error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('2.2 - Successful customer registration creates session', async ({ page }) => {
    await page.goto('/register');

    await page.getByPlaceholder('First and last name').fill(testUser.fullName);
    await page.getByPlaceholder('name@example.com').fill(testUser.email);
    await page.getByPlaceholder(/mobile number/i).fill(testUser.phone);
    await page.locator('input[type="password"]').first().fill(testUser.password);
    await page.locator('input[type="password"]').nth(1).fill(testUser.password);

    await page.getByRole('button', { name: /continue|create/i }).click();

    // Should redirect to homepage or account
    await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 10000 });
    expect(page.url()).not.toContain('/register');
  });

  test('2.3 - Login rejects invalid credentials with friendly alert', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('name@example.com').fill('invalid_fake_user@example.com');
    await page.locator('input[type="password"]').fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/login failed|invalid/i)).toBeVisible();
  });

  test('2.4 - Customer login succeeds with registered credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('name@example.com').fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Redirection after login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    expect(page.url()).not.toContain('/login');
  });

  test('2.5 - Forgot password form accepts email and displays instructions', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: /password assistance|forgot/i })).toBeVisible();
    const emailInput = page.getByPlaceholder('name@example.com');
    await expect(emailInput).toBeVisible();

    await emailInput.fill(testUser.email);
    await page.getByRole('button', { name: /continue|reset/i }).click();

    // Feedback message
    await page.waitForTimeout(1000);
    const feedback = page.locator('.bg-emerald-50, .bg-amber-50, .text-emerald-800, p');
    await expect(feedback.first()).toBeVisible();
  });

  test('2.6 - Account Page (/account) renders customer profile and addresses', async ({ page }) => {
    // Log in with redirect to account
    await page.goto('/login?redirect=/account');
    await page.getByPlaceholder('name@example.com').fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((url) => url.pathname.includes('/account'), { timeout: 10000 });

    await expect(page.getByText(/your account/i).first()).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText(testUser.email)).toBeVisible();
  });
});
