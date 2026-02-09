import { expect, test } from "@playwright/test";

test.describe("Collection CRUD Operations", () => {
	test.describe("Services Collection", () => {
		test("should list services", async ({ page }) => {
			await page.goto("/admin/collections/services");

			// Wait for table to load
			await expect(page.getByRole("table")).toBeVisible();

			// Should have at least one row (seeded data)
			const rows = page.getByRole("row");
			await expect(rows).toHaveCount(2); // Header + at least 1 data row
		});

		test("should create a new service", async ({ page }) => {
			await page.goto("/admin/collections/services");

			// Click create button
			await page.getByRole("button", { name: /create|add|new/i }).click();

			// Fill form
			await page.getByLabel(/name/i).fill("Test Service");
			await page.getByLabel(/duration/i).fill("30");
			await page.getByLabel(/price/i).fill("25");

			// Submit
			await page.getByRole("button", { name: /save|create|submit/i }).click();

			// Should show success message
			await expect(page.getByText(/created|success/i)).toBeVisible();
		});

		test("should edit a service", async ({ page }) => {
			await page.goto("/admin/collections/services");

			// Click on first row to edit
			await page.getByRole("row").nth(1).click();

			// Wait for form to load
			await expect(page.getByLabel(/name/i)).toBeVisible();

			// Update name
			await page.getByLabel(/name/i).clear();
			await page.getByLabel(/name/i).fill("Updated Service Name");

			// Save
			await page.getByRole("button", { name: /save|update/i }).click();

			// Should show success
			await expect(page.getByText(/updated|saved|success/i)).toBeVisible();
		});

		test("should delete a service", async ({ page }) => {
			await page.goto("/admin/collections/services");

			// Get initial row count
			const initialRows = await page.getByRole("row").count();

			// Click delete button on first row
			await page
				.getByRole("row")
				.nth(1)
				.getByRole("button", { name: /delete|remove/i })
				.click();

			// Confirm deletion
			await page.getByRole("button", { name: /confirm|yes|delete/i }).click();

			// Should have one less row
			await expect(page.getByRole("row")).toHaveCount(initialRows - 1);
		});
	});

	test.describe("Pages Collection", () => {
		test("should create a page with auto-generated slug", async ({ page }) => {
			await page.goto("/admin/collections/pages");

			// Click create
			await page.getByRole("button", { name: /create|add|new/i }).click();

			// Fill title
			await page.getByLabel(/title/i).fill("My Test Page");

			// Wait for slug to be auto-generated (debounced)
			await page.waitForTimeout(500);

			// Slug should be auto-generated
			const slugInput = page.getByLabel(/slug/i);
			await expect(slugInput).toHaveValue("my-test-page");
		});

		test("should allow manual slug override", async ({ page }) => {
			await page.goto("/admin/collections/pages");

			// Click create
			await page.getByRole("button", { name: /create|add|new/i }).click();

			// Fill title
			await page.getByLabel(/title/i).fill("Another Page");
			await page.waitForTimeout(500);

			// Override slug manually
			await page.getByLabel(/slug/i).clear();
			await page.getByLabel(/slug/i).fill("custom-slug");

			// Change title again
			await page.getByLabel(/title/i).fill("Changed Title");
			await page.waitForTimeout(500);

			// Slug should remain custom (not overwritten)
			await expect(page.getByLabel(/slug/i)).toHaveValue("custom-slug");
		});
	});
});
