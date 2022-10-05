import DynamoDB from 'aws-sdk/clients/dynamodb';

const ddb = new DynamoDB();

export interface Item {
	id: string;
}

export async function get<T extends Item>(id: string, type: string): Promise<T> {
	const result = await ddb
		.getItem({
			TableName: process.env.DBTABLE,
			ConsistentRead: true,
			Key: DynamoDB.Converter.marshall({ id, type }),
		})
		.promise();
	return DynamoDB.Converter.unmarshall(result.Item) as T;
}

export async function set<T extends Item>(
	item: T & { [key: string]: any },
	type: string
): Promise<void> {
	await ddb
		.putItem({
			TableName: process.env.DBTABLE,
			Item: DynamoDB.Converter.marshall({ type, ...item, context: undefined }),
		})
		.promise();
}

export async function remove(id: string, type: string): Promise<void> {
	await ddb
		.deleteItem({
			TableName: process.env.DBTABLE,
			Key: DynamoDB.Converter.marshall({
				id,
				type,
			}),
		})
		.promise();
}

export async function list<T extends Item>(type: string): Promise<T[]> {
	return (
		await ddb
			.scan({
				TableName: process.env.DBTABLE!,
				FilterExpression: '#type = :type',
				ExpressionAttributeValues: { ':type': { S: type } },
				ExpressionAttributeNames: { '#type': 'type' },
			})
			.promise()
	).Items?.map((x) => DynamoDB.Converter.unmarshall(x) as T);
}
