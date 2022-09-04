import { test, expect } from '@playwright/test';
import playwrightApiMatchers from 'odottaa';
expect.extend(playwrightApiMatchers);

test.describe('Workers tests', () => {
	test('task1 should return JSON "Hello from Gusto!"', async ({ request }) => {
		const response = await request.get('/workers/task1');

		await expect(response).toHaveStatusCode(200);
		expect(await response.json()).toEqual({ demo: 'Hello from Gusto!' });
	});

	test('task2 should return JSON "Hello World!"', async ({ request }) => {
		const response = await request.get('/workers/task2');

		await expect(response).toHaveStatusCode(200);
		await expect(response).toMatchJSON({ demo: 'Hello World!' });
	});

	test('task3 should return JSON', async ({ request }) => {
		const response = await request.post('/workers/task3', {
			data: JSON.stringify({
				message: 'Hello World!',
			}),
		});

		await expect(response).toHaveStatusCode(200);
		await expect(response).toMatchJSON({ params: { message: 'Hello World!' } });
	});

	test('task4 should return JSON "Hello World!"', async ({ request }) => {
		const response = await request.get('/workers/task4');

		await expect(response).toHaveStatusCode(200);
		expect(await response.json()).toEqual({ demo: 'Hello World!' });
	});
});
