import AWS from 'aws-sdk';

const ddb = new AWS.DynamoDB();

export async function handler(event: any): Promise<any> {
	const result = await ddb
		.scan({
			TableName: process.env.DBTABLE,
			FilterExpression: 'attribute_exists(#alarm)',
			ConsistentRead: true,
			ExpressionAttributeNames: { '#alarm': 'alarm' }
		})
		.promise();

	for (const event of result.Items?.map((x) => AWS.DynamoDB.Converter.unmarshall(x))) {
		if (Date.now() >= event.alarm) {
			console.log(`Trigger alarm for Saga ID ${event.id}.`);

			const lambda = new AWS.Lambda();
			await lambda
				.invokeAsync({
					InvokeArgs: JSON.stringify({ event: { ...event, command: 'onAlarm' } }),
					FunctionName: process.env.FUNCTION
				})
				.promise();
		}
	}
}
