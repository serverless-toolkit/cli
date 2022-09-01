const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB();

export async function handler(request: any) {
	const connectionId = request.requestContext?.connectionId;
	const eventType = request.requestContext?.eventType;

	switch (eventType) {
		case 'CONNECT':
			await ddb
				.putItem({
					TableName: process.env.DBTABLE,
					Item: AWS.DynamoDB.Converter.marshall({
						id: connectionId,
						type: 'connection',
						expiresAt: Math.floor(new Date(new Date().getTime() + 1440 * 60000).getTime() / 1000)
					})
				})
				.promise();
			break;
		case 'MESSAGE':
			break;
		case 'DISCONNECT':
			await ddb
				.deleteItem({
					TableName: process.env.DBTABLE,
					Key: AWS.DynamoDB.Converter.marshall({
						id: connectionId,
						type: 'connection'
					})
				})
				.promise();
			break;
	}

	return {};
}
