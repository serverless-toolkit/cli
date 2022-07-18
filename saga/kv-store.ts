import AWS from 'aws-sdk';

const ddb = new AWS.DynamoDB();

export async function get(id: string) {
	const result = await ddb
		.getItem({
			TableName: process.env.DBTABLE,
			ConsistentRead: true,
			Key: AWS.DynamoDB.Converter.marshall({ id, type: 'saga' })
		})
		.promise();
	return AWS.DynamoDB.Converter.unmarshall(result.Item);
}

export async function set(state: any) {
	await ddb
		.putItem({
			TableName: process.env.DBTABLE,
			Item: AWS.DynamoDB.Converter.marshall({ type: 'saga', ...state, context: undefined })
		})
		.promise();
}
