import AWS from 'aws-sdk';
import { NodeVM } from 'vm2';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { Request, Response, kvStore as store } from '@serverless-toolkit/sdk';

export async function handler(request: APIGatewayProxyEventV2 & { fileContent: string }) {
	const s3 = new AWS.S3({ useAccelerateEndpoint: true });
	let body = request.body || {};

	try {
		if (request.body && request.isBase64Encoded) {
			body = request.body && JSON.parse(Buffer.from(request.body, 'base64').toString());
		}
	} catch (error) {
		console.error(error);
	}

	const event = {
		...request,
		body,
	} as Request;

	const response: Response = { statusCode: 200, cookies: [], headers: {} };
	const vm = new NodeVM({
		console: 'redirect',
		env: process.env,
		sandbox: {
			event,
			response,
			process,
			context: {
				store,
			},
		},
		wrapper: 'none',
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
	const codeFileName: string = request.rawPath.slice(1);
	try {
		let s3Content: string | undefined;
		try {
			s3Content = request.fileContent
				? request.fileContent
				: (
						await s3
							.getObject({ Bucket: process.env.CODEBUCKET!, Key: `${codeFileName}.js` })
							.promise()
				  )?.Body?.toString();
		} catch (error) {
			await send({ timestamp: new Date(), message: `Worker: ${codeFileName} not found` });
			return {
				statusCode: 404,
			};
		}
		await send({ timestamp: new Date(), message: `Invoke worker: ${codeFileName}` });

		const workerResult = await vm.run(`${s3Content}
return ${
			event.requestContext?.http?.method?.toUpperCase() || codeFileName?.split('/').slice(-1).join()
		}(event, response); 
		`);

		return {
			...response,
			body: JSON.stringify(workerResult),
		};
	} catch (error) {
		await send({ timestamp: new Date(), message: `Worker error: ${error}` });
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
