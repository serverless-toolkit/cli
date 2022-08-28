import AWS from 'aws-sdk';
import path from 'path';
import querystring from 'querystring';
import mimetype from 'mime-types';
import multipartFormParser from 'lambda-multipart-parser';
import { NodeVM } from 'vm2';
import * as store from '../lib/kv-store';

interface HandlerRequest {
	domainName: string;
	domainPrefix: string;
	requestContext: {
		http: {
			method: string;
			path: string;
			sourceIp: string;
			userAgent: string;
		};
	};
	body: any;
	rawPath: string;
	cookies: string[];
	headers: { [key: string]: string };
	queryStringParameters: { [key: string]: string };
	isBase64Encoded: boolean;
}

module.exports.handler = async function (request): Promise<any> {
	if (!request) return { statusCode: 404 };

	//set default to index
	if (
		!request.rawPath ||
		request.rawPath === '/' ||
		request.rawPath === '/pages' ||
		request.rawPath === '/pages/'
	) {
		request.rawPath = '/pages/index';
	}

	if (!request.rawPath.includes('/pages')) {
		request.rawPath = `/pages${request.rawPath}`;
	}
	const codeFileName = request.rawPath.slice(1).toLowerCase();

	const ct = mimetype.contentType(path.extname(codeFileName)) || 'text/html; charset=UTF-8';
	const isBase64Encoded = ct.includes('image/');
	const s3 = new AWS.S3();

	let svxContent = '';
	try {
		svxContent = (
			await s3
				.getObject({
					Bucket: process.env.CODEBUCKET,
					Key: `${codeFileName}.js`
				})
				.promise()
		).Body.toString();
	} catch (error) {}

	//handle static files
	if (!svxContent) {
		await send({ timestamp: new Date(), message: `Invoke static: ${codeFileName}` });
		const staticContent = await s3
			.getObject({ Bucket: process.env.CODEBUCKET, Key: codeFileName })
			.promise();
		return {
			statusCode: 200,
			headers: { 'Content-Type': ct },
			body: isBase64Encoded ? staticContent.Body.toString('base64') : staticContent.Body.toString(),
			isBase64Encoded
		};
	}

	//application/x-www-form-urlencoded
	if (
		request.headers &&
		request.headers['content-type'] === 'application/x-www-form-urlencoded' &&
		request.requestContext?.http?.method?.toLowerCase() === 'post' &&
		request.body
	) {
		if (request.isBase64Encoded) {
			request.body = Buffer.from(request.body, 'base64').toString();
			request.isBase64Encoded = false;
		}
		request.body = querystring.decode(request.body);
	}
	//multipart/form-data
	if (
		request.headers &&
		request.headers['content-type']?.includes('multipart/form-data') &&
		request.requestContext?.http?.method?.toLowerCase() === 'post' &&
		request.body
	) {
		request.body = await multipartFormParser.parse(request);
	}

	const vm = new NodeVM({
		console: 'redirect',
		sandbox: {
			process,
			context: {
				store
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

	await send({ timestamp: new Date(), message: `Invoke page: ${codeFileName}` });
	const svelteComponent = vm.run(svxContent);
	const response = { statusCode: 200, cookies: [], headers: {} };
	const data =
		svelteComponent.load &&
		(await svelteComponent.load(
			{
				...request,
				...svelteComponent.metadata,
				context: {
					store
				}
			},
			response
		));
	const { html, css, head } = svelteComponent.default.render({});

	return {
		...response,
		cookies: [...response.cookies],
		headers: { ...response.headers, 'content-type': ct },
		isBase64Encoded,
		body: `
<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		${data ? `<script>var __data = ${JSON.stringify(data)}</script>` : ''}
		${head}		
		<style type="text/css">
			${css.code}
		</style>
	</head>
	<body>
		${html}
	</body>	
</html>
`
	};
};

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
