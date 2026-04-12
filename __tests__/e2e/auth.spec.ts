/**
 * End-to-End Authentication Flow Tests
 * Using Playwright for comprehensive user journey testing
 */

import { test, expect } from "@playwright/test";

test.describe("Sign Up Flow", () => {
  test("should complete sign up with valid credentials", async ({ page }) => {
    await page.goto("/sign-up");

    // Fill in the sign-up form
    await page.fill('input[name="name"]', "John Doe");
    await page.fill('input[name="email"]', "john.doe@example.com");
    await page.fill('input[name="password"]', "SecurePassword123!");
    await page.fill('input[name="confirmPassword"]', "SecurePassword123!");

    // Submit the form
    await page.click('button[type="submit"]');

    // Should see verification code prompt
    await expect(page).toHaveURL(/verify|verification/);
  });

  // Fixed: Playwright uses test() not it() — it() is a Mocha/Jest convention
  test("should show validation errors for invalid email", async ({ page }) => {
    await page.goto("/sign-up");

    await page.fill('input[name="name"]', "John Doe");
    await page.fill('input[name="email"]', "invalid-email");
    await page.fill('input[name="password"]', "SecurePassword123!");

    await page.click('button[type="submit"]');

    // Should see error message
    const error = page.locator("text=Valid email");
    await expect(error).toBeVisible();
  });

  test("should reject weak passwords", async ({ page }) => {
    await page.goto("/sign-up");

    await page.fill('input[name="name"]', "John Doe");
    await page.fill('input[name="email"]', "john@example.com");
    await page.fill('input[name="password"]', "weak");

    await page.click('button[type="submit"]');

    const error = page.locator("text=at least 8 characters");
    await expect(error).toBeVisible();
  });
});

test.describe("Sign In Flow", () => {
  test("should sign in with valid credentials", async ({ page }) => {
    // Assume user exists in test database
    await page.goto("/sign-in");

    await page.fill('input[name="email"]', "existing@example.com");
    await page.fill('input[name="password"]', "SecurePassword123!");

    await page.click('button[type="submit"]');

    // Should redirect to dashboard on success
    await expect(page).toHaveURL(/dashboard|onboarding/);
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/sign-in");

    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "WrongPassword123!");

    await page.click('button[type="submit"]');

    const error = page.locator("text=Invalid email or password");
    await expect(error).toBeVisible();
  });

  test("should handle account lockout after failed attempts", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    // Make multiple failed attempts
    for (let i = 0; i < 6; i++) {
      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "WrongPassword123!");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // Should see lockout message
    const lockoutMessage = page.locator("text=temporarily locked");
    await expect(lockoutMessage).toBeVisible();
  });
});

test.describe("Password Reset Flow", () => {
  test("should complete password reset", async ({ page }) => {
    await page.goto("/forgot-password");

    await page.fill('input[name="email"]', "user@example.com");
    await page.click('button[type="submit"]');

    // Should show verification code prompt
    await expect(page).toHaveURL(/verify|verification/);

    // Enter OTP
    await page.fill('input[name="code"]', "123456");

    // Enter new password
    await page.fill('input[name="password"]', "NewPassword123!");
    await page.fill('input[name="confirmPassword"]', "NewPassword123!");

    await page.click('button[type="submit"]');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in|dashboard/);
  });

  test("should reject mismatched passwords", async ({ page }) => {
    await page.goto("/forgot-password");

    await page.fill('input[name="email"]', "user@example.com");
    await page.click('button[type="submit"]');

    await page.fill('input[name="code"]', "123456");

    await page.fill('input[name="password"]', "NewPassword123!");
    await page.fill('input[name="confirmPassword"]', "DifferentPassword123!");

    await page.click('button[type="submit"]');

    const error = page.locator("text=Passwords do not match");
    await expect(error).toBeVisible();
  });
});

test.describe("Rate Limiting", () => {
  test("should block multiple rapid requests", async ({ page }) => {
    // Make multiple sign-in attempts rapidly
    for (let i = 0; i < 10; i++) {
      await page.goto("/sign-in");

      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "test");

      await page.click('button[type="submit"]');
      await page.waitForTimeout(100);
    }

    // Should eventually see rate limit message
    const rateLimitMessage = page.locator(
      "text=too many|Too many|rate limit"
    );
    await expect(rateLimitMessage).toBeVisible({ timeout: 10000 });
  });
});
