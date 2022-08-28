import AWS from 'aws-sdk';

const ddb = new AWS.DynamoDB();

export async function get(id: string, type: string) {
	const result = await ddb
		.getItem({
			TableName: process.env.DBTABLE,
			ConsistentRead: true,
			Key: AWS.DynamoDB.Converter.marshall({ id, type })
		})
		.promise();
	return AWS.DynamoDB.Converter.unmarshall(result.Item);
}

export interface Item {
	id: string;
}

export async function set(item: Item & { [key: string]: any }, type: string) {
	await ddb
		.putItem({
			TableName: process.env.DBTABLE,
			Item: AWS.DynamoDB.Converter.marshall({ type, ...item, context: undefined })
		})
		.promise();
}
