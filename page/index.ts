import AWS from 'aws-sdk';
import path from 'path';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import querystring from 'querystring';
import mimetype from 'mime-types';
import multipartFormParser from 'lambda-multipart-parser';
import { NodeVM } from 'vm2';
import * as store from '../lib/kv-store';
import { Request, Response } from '../lib';

module.exports.handler = async function (
	request: APIGatewayProxyEventV2 & { fileContent: string }
): Promise<any> {
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

	let svxContent: string | undefined;
	try {
		svxContent = request.fileContent
			? request.fileContent
			: (
					await s3
						.getObject({ Bucket: process.env.CODEBUCKET!, Key: `${codeFileName}.js` })
						.promise()
			  )?.Body?.toString();
	} catch {}

	//handle static files
	if (!svxContent) {
		try {
			await send({ timestamp: new Date(), message: `Invoke static: ${codeFileName}` });
			const staticContent = await s3
				.getObject({ Bucket: process.env.CODEBUCKET!, Key: codeFileName })
				.promise();
			return {
				statusCode: 200,
				headers: { 'Content-Type': ct },
				body: isBase64Encoded
					? staticContent?.Body?.toString('base64')
					: staticContent?.Body?.toString(),
				isBase64Encoded
			};
		} catch (error) {
			await send({ timestamp: new Date(), message: `Not found static: ${codeFileName}` });
			return {
				statusCode: 404
			};
		}
	}

	if (!svxContent) {
		await send({ timestamp: new Date(), message: `Not found page: ${codeFileName}` });
		return {
			statusCode: 404
		};
	}

	await send({ timestamp: new Date(), message: `Found page: ${codeFileName}` });

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
		request.body = querystring.decode(request.body) as any;
	}
	//multipart/form-data
	if (
		request.headers &&
		request.headers['content-type']?.includes('multipart/form-data') &&
		request.requestContext?.http?.method?.toLowerCase() === 'post' &&
		request.body
	) {
		request.body = (await multipartFormParser.parse(request as any)) as any;
	}

	await send({ timestamp: new Date(), message: `Invoke page: ${codeFileName}` });

	try {
		const vm = new NodeVM({
			timeout: 60 * 1000 * 15,
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

		const svelteComponent = vm.run(svxContent);
		const response: Response = { statusCode: 200, cookies: [], headers: {} };
		const functionNameToInvoke = request.requestContext?.http?.method
			? request.requestContext?.http?.method?.toLowerCase()
			: 'load';
		const data =
			svelteComponent[functionNameToInvoke] &&
			(await svelteComponent[functionNameToInvoke](
				{
					...request,
					...svelteComponent.metadata,
					context: {
						store
					}
				} as Request,
				response
			));

		const { html, css, head } = svelteComponent.default.render({});

		return {
			...response,
			statusCode: response.statusCode,
			cookies: response.cookies,
			headers: { ...response.headers, 'content-type': ct },
			isBase64Encoded,
			body: generateHtml(head, css.code, html, data)
		};
	} catch (error) {
		console.error(error);
		await send({
			timestamp: new Date(),
			codeFileName,
			message: error.message,
			error
		});
	}
};

async function send(message) {
	if (!(process.env.DBTABLE || process.env.WS_API_URL)) {
		console.log(JSON.stringify(message, null, 4));
		return;
	}

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

function generateHtml(head: string, css: string, html: string, data: any) {
	return `
	<!doctype html>
	<html>
		<head>
			<meta charset="utf-8">
			${data ? `<script>var __data = ${JSON.stringify(data)}</script>` : ''}
			${head}		
			<style type="text/css">
				${css}
			</style>
		</head>
		<body>
			${html}
		</body>	
	</html>
	`;
}
