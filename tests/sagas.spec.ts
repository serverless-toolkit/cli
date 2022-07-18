import { test, expect } from '@playwright/test';
import playwrightApiMatchers from 'odottaa';
expect.extend(playwrightApiMatchers);

test.describe('Sagas tests', () => {
	test('Counter with id "9033d080-faa7-11ec-b35e-57b7521c2504" should return id "9033d080-faa7-11ec-b35e-57b7521c2504"', async ({
		request
	}) => {
		const response = await request.get(
			'https://serverless-toolkit-cli.serverless-toolkit.com/sagas/Counter?id=9033d080-faa7-11ec-b35e-57b7521c2504'
		);
		await expect(response).toHaveStatusCode(200);
		await expect(response).toMatchJSON({ id: '9033d080-faa7-11ec-b35e-57b7521c2504' });
	});
	test('Counter with id "9033d080-faa7-11ec-b35e-57b7521c2504" should update value', async ({
		request
	}) => {
		const response = await request.post('https://serverless-toolkit-cli.serverless-toolkit.com/sagas/Counter', {
			data: JSON.stringify({
				id: '9033d080-faa7-11ec-b35e-57b7521c2504',
				command: 'increment'
			})
		});
		await expect(response).toHaveStatusCode(200);
		await expect(response).toMatchJSON({ id: '9033d080-faa7-11ec-b35e-57b7521c2504' });
	});
});
