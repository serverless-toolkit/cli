import AWS from 'aws-sdk';

const ddb = new AWS.DynamoDB();

export interface Item {
	id: string;
}

export async function get<T extends Item>(id: string, type: string): Promise<T> {
	const result = await ddb
		.getItem({
			TableName: process.env.DBTABLE,
			ConsistentRead: true,
			Key: AWS.DynamoDB.Converter.marshall({ id, type })
		})
		.promise();
	return AWS.DynamoDB.Converter.unmarshall(result.Item) as T;
}

export async function set<T extends Item>(item: T & { [key: string]: any }, type: string): Promise<void> {
	await ddb
		.putItem({
			TableName: process.env.DBTABLE,
			Item: AWS.DynamoDB.Converter.marshall({ type, ...item, context: undefined })
		})
		.promise();
}
