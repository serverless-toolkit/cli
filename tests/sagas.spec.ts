import { test, expect } from '@playwright/test';
import playwrightApiMatchers from 'odottaa';
expect.extend(playwrightApiMatchers);

test.describe('Sagas tests', () => {
	let sagaId: string;

	test('Saga1 that not exists should status code 404', async ({ request }) => {
		const response = await request.get('/sagas/404');

		await expect(response).toHaveStatusCode(404);
	});

	test('Saga1 should return JSON "value: 0"', async ({ request }) => {
		const response = await request.get(`/sagas/Saga1`);
		const data = await response.json();

		await expect(response).toHaveStatusCode(200);
		await expect(response).toMatchJSON({ value: 0 });
		sagaId = data.id;
	});

	test('Saga1 GET increment command', async ({ request }) => {
		const response = await request.get(
			`/sagas/Saga1?id=${sagaId}&command=increment`
		);
		await expect(response).toHaveStatusCode(200);
		await expect(response).toMatchJSON({ value: 1 });
	});

	test('Saga1 POST increment command', async ({ request }) => {
		const response = await request.post(`/sagas/Saga1`, {
			data: {
				id: sagaId,
				command: 'increment'
			}
		});
		await expect(response).toHaveStatusCode(200);
		await expect(response).toMatchJSON({ value: 2 });
	});
});
