import { expect, test } from "@playwright/test";

test.describe("Admin Navigation", () => {
	test("should display dashboard", async ({ page }) => {
		await page.goto("/admin");

		// Dashboard should be visible
		await expect(
			page.getByRole("heading", { name: /dashboard/i }),
		).toBeVisible();
	});

	test("should navigate to collections", async ({ page }) => {
		await page.goto("/admin");

		// Click on a collection in sidebar
		await page.getByRole("link", { name: /services/i }).click();

		// Should show collection list
		await expect(page).toHaveURL(/\/admin\/collections\/services/);
		await expect(
			page.getByRole("heading", { name: /services/i }),
		).toBeVisible();
	});

	test("should navigate to globals", async ({ page }) => {
		await page.goto("/admin");

		// Click on site settings
		await page.getByRole("link", { name: /site settings/i }).click();

		// Should show global editor
		await expect(page).toHaveURL(/\/admin\/globals\/siteSettings/);
	});

	test("should toggle sidebar on mobile", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/admin");

		// Sidebar should be hidden initially on mobile
		const sidebar = page.getByRole("navigation", { name: /sidebar/i });

		// Click menu button to open sidebar
		await page.getByRole("button", { name: /menu|toggle/i }).click();

		// Sidebar should be visible
		await expect(sidebar).toBeVisible();
	});
});
