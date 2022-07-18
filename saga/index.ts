import AWS from 'aws-sdk';
import { v1 } from 'uuid';
import * as store from './kv-store';
import { NodeVM } from 'vm2';

export async function handler(request: any): Promise<any> {
	const s3 = new AWS.S3();
	let body: any = {};
	let saga = {};

	try {
		body = request.body && JSON.parse(Buffer.from(request.body, 'base64').toString());
	} catch (error) {
		console.error(error);
	}

	const event = {
		id: request.queryStringParameters?.id || request.event?.id || body?.id || v1(),
		...request.event,
		...body,
		...request.queryStringParameters
	};

	//Init domain object
	const vm = new NodeVM({
		console: 'redirect',
		wrapper: 'none',
		sandbox: {
			process,
			event,
			state: await store.get(event?.id),
			context: {
				store,
				alarm: {
					async set(minute: number) {
						saga['alarm'] = new Date(new Date().getTime() + minute * 60000).getTime();
						await store.set(saga);
					},
					async clear() {
						saga['alarm'] = undefined;
						await store.set(saga);
					}
				}
			}
		},
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
	try {
		const codeFileName = request.rawPath?.slice(1) || `sagas/${event.object}`;

		let s3Content: any = { Body: '' };
		try {
			s3Content = await s3
				.getObject({ Bucket: process.env.CODEBUCKET, Key: `${codeFileName}.js` })
				.promise();
		} catch (error) {
			await send({ timestamp: new Date(), message: `Saga: ${codeFileName} not found.` });
			return {
				statusCode: 404
			};
		}

		await send({ timestamp: new Date(), message: `Invoke saga: ${codeFileName}.` });

		saga = vm.run(`${s3Content?.Body?.toString()}
const saga = new ${event.object || request.rawPath?.replace('/sagas/', '')}(event);
Object.assign(saga, event, state, { context });
event.command && saga[event.command] && saga[event.command]();
return saga;`);
		await store.set({ ...saga, object: event.object, context: undefined, command: undefined });

		return { ...saga, type: undefined, context: undefined, object: undefined, command: undefined };
	} catch (error) {
		await send({ timestamp: new Date(), message: `Saga error: ${error}` });
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
						ConnectionId: x?.id,
						Data: JSON.stringify(message, null, 4)
					})
					.promise()
					.catch((error) => {
						console.error(error);
						return ddb
							.deleteItem({
								TableName: process.env.DBTABLE,
								Key: AWS.DynamoDB.Converter.marshall({
									id: x?.id,
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
