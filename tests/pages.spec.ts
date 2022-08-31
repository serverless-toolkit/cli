import { test, expect } from '@playwright/test';

test.describe('Pages tests', () => {
	test('page page1.svx should contain title "Page1"', async ({ page }) => {
		await page.goto('http://localhost:4173/page1');

		await expect(page).toHaveTitle('Page1');
	});
});
