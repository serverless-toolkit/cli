import { test, expect } from '@playwright/test';

test.describe('Pages tests', () => {
	test('page2 should contain a button', async ({ page }) => {
		await page.goto('https://serverless-toolkit-cli.serverless-toolkit.com/pages/page2');
		const name = await page.locator('data-testid=btn').innerText();

		expect(name).toBe('Press Me!');
	});
	test('page3 should have title "Query Parameters"', async ({ page }) => {
		await page.goto('https://serverless-toolkit-cli.serverless-toolkit.com/pages/page3');
		const title = await page.title();

		expect(title).toBe('Query Parameters');
	});
});
