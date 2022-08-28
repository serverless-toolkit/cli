import AWS from 'aws-sdk';
import * as store from '../lib/kv-store';
import { NodeVM } from 'vm2';

export async function handler(request: any) {
	const s3 = new AWS.S3();
	let body: any = {};

	try {
		body = request.body && JSON.parse(Buffer.from(request.body, 'base64').toString());
	} catch (error) {
		console.error(error);
	}
	const event = {
		...request.event,
		...body,
		...request.queryStringParameters
	};
	const vm = new NodeVM({
		console: 'redirect',
		env: process.env,
		sandbox: {
			event,
			process,
			context: {
				store
			}
		},
		wrapper: 'none',
		require: {
			external: true,
			builtin: ['*'],
			resolve: (a) => require.resolve(a)
		}
	});
	vm.on('console.log', async (data) => {
		await send({ timestamp: new Date(), message: data });
	});
	vm.on('console.error', async (data) => {
		await send({ timestamp: new Date(), message: data });
	});
	const codeFileName: string = request.rawPath.slice(1);
	try {
		let s3Content: any = { Body: '' };
		try {
			s3Content = await s3
				.getObject({ Bucket: process.env.CODEBUCKET, Key: `${codeFileName}.js` })
				.promise();
		} catch (error) {
			await send({ timestamp: new Date(), message: `Worker: ${codeFileName} not found` });
			return {
				statusCode: 404
			};
		}
		await send({ timestamp: new Date(), message: `Invoke worker: ${codeFileName}` });
		return vm.run(`${s3Content.Body.toString()}
return  ${codeFileName?.replace('workers/', '')}(event);
		`);
	} catch (error) {
		await send({ timestamp: new Date(), message: `Worker error: ${error}` });
		return { message: error };
	}
}

async function send(message) {
	const ddb = new AWS.DynamoDB();
	const api = new AWS.ApiGatewayManagementApi({ endpoint: process.env.WS_API_URL });

	try {
		const result = await ddb
			.scan({
				TableName: process.env.DBTABLE,
				ConsistentRead: true,
				FilterExpression: '#d0a30 = :d0a30',
				ExpressionAttributeValues: { ':d0a30': { S: 'connection' } },
				ExpressionAttributeNames: { '#d0a30': 'type' }
			})
			.promise();

		await Promise.all(
			result.Items?.map((x) => AWS.DynamoDB.Converter.unmarshall(x)).map((x) => {
				return api
					.postToConnection({
						ConnectionId: x.id,
						Data: JSON.stringify(message, null, 4)
					})
					.promise()
					.catch((error) => {
						console.error(error);
						return ddb
							.deleteItem({
								TableName: process.env.DBTABLE,
								Key: AWS.DynamoDB.Converter.marshall({
									id: x.id,
									type: 'connection'
								})
							})
							.promise()
							.catch((error) => {
								console.error(error);
							});
					});
			})
		);
	} catch (error) {
		console.error(error);
	}
}
