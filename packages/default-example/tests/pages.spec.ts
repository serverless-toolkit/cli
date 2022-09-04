import { test, expect } from '@playwright/test';

test.describe('Page tests', () => {
	test('page index.svx should contain title "Simple Page Example"', async ({ page }) => {
		await page.goto('/simple-test');

		await expect(page).toHaveTitle('Simple Page Example');
	});

	test('page index.svx should contain "data-test=description" with text', async ({ page }) => {
		await page.goto('/simple-test');

		await expect(page.locator('data-test=description')).toHaveText(
			'A simple example page using MdSvx.'
		);
	});

	test('page2 should contain a button', async ({ page }) => {
		await page.goto('/pages/page2');
		const name = await page.locator('data-testid=btn').innerText();

		expect(name).toBe('Press Me!');
	});

	test('page3 should have title "Query Parameters"', async ({ page }) => {
		await page.goto('/pages/page3');
		const title = await page.title();

		expect(title).toBe('Query Parameters');
	});
});
