import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

/**
 * Authentication setup - runs before all tests.
 * Logs in as admin and saves session state for reuse.
 */
setup("authenticate as admin", async ({ page }) => {
	// Navigate to admin login
	await page.goto("/admin");

	// Wait for login form or dashboard
	const isLoggedIn = await page
		.getByRole("heading", { name: /dashboard/i })
		.isVisible()
		.catch(() => false);

	if (!isLoggedIn) {
		// Fill login form
		// TODO: Update selectors based on actual login form
		await page.getByLabel(/email/i).fill("admin@example.com");
		await page.getByLabel(/password/i).fill("admin123");
		await page.getByRole("button", { name: /sign in|log in/i }).click();

		// Wait for dashboard to load
		await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible(
			{ timeout: 10000 },
		);
	}

	// Save signed-in state
	await page.context().storageState({ path: authFile });
});
