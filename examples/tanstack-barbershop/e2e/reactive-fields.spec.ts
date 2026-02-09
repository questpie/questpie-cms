import { expect, test } from "@playwright/test";

test.describe("Reactive Fields", () => {
	test.describe("Conditional Visibility", () => {
		test("should show cancellation reason only when status is cancelled", async ({
			page,
		}) => {
			await page.goto("/admin/collections/appointments");

			// Click create or edit first appointment
			await page.getByRole("button", { name: /create|add|new/i }).click();

			// Cancellation reason should be hidden initially
			await expect(page.getByLabel(/cancellation reason/i)).not.toBeVisible();

			// Change status to cancelled
			await page.getByLabel(/status/i).click();
			await page.getByRole("option", { name: /cancelled/i }).click();

			// Cancellation reason should now be visible
			await expect(page.getByLabel(/cancellation reason/i)).toBeVisible();

			// Change status back to pending
			await page.getByLabel(/status/i).click();
			await page.getByRole("option", { name: /pending/i }).click();

			// Cancellation reason should be hidden again
			await expect(page.getByLabel(/cancellation reason/i)).not.toBeVisible();
		});

		test("should show SEO fields only when page is published", async ({
			page,
		}) => {
			await page.goto("/admin/collections/pages");
			await page.getByRole("button", { name: /create|add|new/i }).click();

			// SEO fields should be hidden initially (isPublished = false)
			await expect(page.getByLabel(/meta title/i)).not.toBeVisible();
			await expect(page.getByLabel(/meta description/i)).not.toBeVisible();

			// Toggle isPublished to true
			await page.getByLabel(/published/i).check();

			// SEO fields should now be visible
			await expect(page.getByLabel(/meta title/i)).toBeVisible();
			await expect(page.getByLabel(/meta description/i)).toBeVisible();
		});

		test("should show featured option only when review is approved", async ({
			page,
		}) => {
			await page.goto("/admin/collections/reviews");
			await page.getByRole("button", { name: /create|add|new/i }).click();

			// Featured should be hidden when not approved
			await expect(page.getByLabel(/featured/i)).not.toBeVisible();

			// Approve the review
			await page.getByLabel(/approved/i).check();

			// Featured should now be visible
			await expect(page.getByLabel(/featured/i)).toBeVisible();
		});
	});

	test.describe("Computed Values", () => {
		test("should auto-generate slug from title", async ({ page }) => {
			await page.goto("/admin/collections/pages");
			await page.getByRole("button", { name: /create|add|new/i }).click();

			// Type title
			await page.getByLabel(/title/i).fill("Hello World Test");

			// Wait for debounced computation
			await page.waitForTimeout(500);

			// Slug should be auto-generated
			await expect(page.getByLabel(/slug/i)).toHaveValue("hello-world-test");
		});

		test("should handle special characters in slug generation", async ({
			page,
		}) => {
			await page.goto("/admin/collections/pages");
			await page.getByRole("button", { name: /create|add|new/i }).click();

			// Type title with special characters
			await page.getByLabel(/title/i).fill("Čo je nové? Ahoj!");

			// Wait for debounced computation
			await page.waitForTimeout(500);

			// Slug should be normalized (no diacritics, special chars replaced)
			const slugValue = await page.getByLabel(/slug/i).inputValue();
			expect(slugValue).toMatch(/^[a-z0-9-]+$/);
			expect(slugValue).not.toContain("?");
			expect(slugValue).not.toContain("!");
		});
	});

	test.describe("Conditional Read-Only", () => {
		test("should make customer name read-only when customer relation is set", async ({
			page,
		}) => {
			await page.goto("/admin/collections/reviews");
			await page.getByRole("button", { name: /create|add|new/i }).click();

			// Customer name should be editable initially
			const customerNameInput = page.getByLabel(/customer name/i);
			await expect(customerNameInput).toBeEditable();

			// Select a customer relation
			await page
				.getByLabel(/customer/i)
				.first()
				.click();
			// Select first option if available
			const customerOption = page.getByRole("option").first();
			if (await customerOption.isVisible()) {
				await customerOption.click();

				// Customer name should now be read-only
				await expect(customerNameInput).not.toBeEditable();
			}
		});
	});
});
