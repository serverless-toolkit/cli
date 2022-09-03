import { test, expect } from '@playwright/test';

test.describe('Pages tests', () => {
	test('page page1.svx should contain title "Page1"', async ({ page }) => {
		const response = await page.goto('/page1');

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle('Page1');
	});

	test('page that not exists should status code 404', async ({ page }) => {
		const response = await page.goto('/404');

		expect(response?.status()).toBe(404);
	});
});
