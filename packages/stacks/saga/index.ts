import AWS from 'aws-sdk';
import { v1 } from 'uuid';
import { kvStore as store } from '@serverless-toolkit/sdk';
import { NodeVM } from 'vm2';

export async function handler(request: any): Promise<any> {
	const s3 = new AWS.S3({ useAccelerateEndpoint: true });

	try {
		if (request.body && request.isBase64Encoded) {
			request.body = JSON.parse(Buffer.from(request.body, 'base64').toString());
		}
	} catch (error) {
		console.error(error);
	}

	const event = {
		id: request.queryStringParameters?.id || request.event?.id || request.body?.id || v1(),
		object: request.body?.object,
		command: request.queryStringParameters?.command || request.body?.command,
	};

	//Restore state from DDB
	const state = await store.get(event?.id, 'saga');
	let saga = { state: { id: event?.id, alarm: 0 }, id: event?.id };

	//Init domain object
	const vm = new NodeVM({
		console: 'redirect',
		wrapper: 'none',
		sandbox: {
			process,
			event,
			state,
			request,
			context: {
				store,
				alarm: {
					//TODO: deprecated
					/**
					 * @deprecated The method should not be used
					 */
					async set(minute: number) {
						saga.state.alarm = new Date(new Date().getTime() + minute * 60000).getTime();
						await store.set(saga.state, 'saga');
					},
					async inMinutes(minute: number) {
						saga.state.alarm = new Date(new Date().getTime() + minute * 60000).getTime();
						await store.set(saga.state, 'saga');
					},
					async atDate(date: Date) {
						saga.state.alarm = date.getTime();
						await store.set(saga.state, 'saga');
					},
					async clear() {
						saga.state.alarm = 0;
						await store.set(saga.state, 'saga');
					},
				},
			},
		},
		require: {
			external: true,
			builtin: ['*'],
			resolve: (a) => require.resolve(a),
		},
	});
	vm.on('console.log', async (data) => {
		await send({ timestamp: new Date(), message: data });
	});
	vm.on('console.error', async (data) => {
		await send({ timestamp: new Date(), message: data });
	});
	try {
		const codeFileName = request.rawPath?.slice(1) || `sagas/${event.object}`;

		let s3Content: string;
		try {
			s3Content = request.fileContent
				? request.fileContent
				: (
						await s3
							.getObject({ Bucket: process.env.CODEBUCKET!, Key: `${codeFileName}.js` })
							.promise()
				  )?.Body?.toString();
		} catch (error) {
			await send({ timestamp: new Date(), message: `Saga: ${codeFileName} not found.` });
			return {
				statusCode: 404,
			};
		}

		await send({ timestamp: new Date(), message: `Invoke saga: ${codeFileName}.` });

		saga = vm.run(`${s3Content}
const saga = new ${event.object || request.rawPath?.split('/').slice(-1).join()}();
Object.assign(saga, event, state, { request, context });
event.command && saga[event.command] && saga[event.command]();
return saga;`);
		await store.set(
			{ ...saga, object: event.object, context: undefined, command: undefined, request: undefined },
			'saga'
		);

		return { ...saga, type: undefined, context: undefined, object: undefined, command: undefined };
	} catch (error) {
		await send({ timestamp: new Date(), message: `Saga error: ${error}` });
		return { message: error };
	}
}

async function send(message: any) {
	if (!(process.env.DBTABLE || process.env.WS_API_URL)) {
		console.log(JSON.stringify(message, null, 4));
		return;
	}

	const ddb = new AWS.DynamoDB();
	const api = new AWS.ApiGatewayManagementApi({ endpoint: process.env.WS_API_URL });

	try {
		const result = await ddb
			.scan({
				TableName: process.env.DBTABLE!,
				ConsistentRead: true,
				FilterExpression: '#d0a30 = :d0a30',
				ExpressionAttributeValues: { ':d0a30': { S: 'connection' } },
				ExpressionAttributeNames: { '#d0a30': 'type' },
			})
			.promise();

		if (!result.Items) return;

		await Promise.all(
			result.Items.map((x) => AWS.DynamoDB.Converter.unmarshall(x)).map(async (x) => {
				try {
					return await api
						.postToConnection({
							ConnectionId: x?.id,
							Data: JSON.stringify(message, null, 4),
						})
						.promise();
				} catch {
					try {
						return await ddb
							.deleteItem({
								TableName: process.env.DBTABLE!,
								Key: AWS.DynamoDB.Converter.marshall({
									id: x?.id,
									type: 'connection',
								}),
							})
							.promise();
					} catch {}
				}
			})
		);
	} catch (error) {
		console.error(error);
	}
}
