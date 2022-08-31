import { test, expect } from '@playwright/test';
import playwrightApiMatchers from 'odottaa';
expect.extend(playwrightApiMatchers);

test.describe('Workers tests', () => {
	test('worker1 should return JSON "Hello World!"', async ({ request }) => {
		const response = await request.get('http://localhost:4173/workers/worker1');

		await expect(response).toHaveStatusCode(200);
		await expect(response).toMatchJSON({ message: 'Hello World!' });
	});
});
