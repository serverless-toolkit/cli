import { DynamoDB } from 'aws-sdk';

async function task3(params: any) {
	const ddb = new DynamoDB();
	const result = await ddb.scan({ TableName: process.env.DBTABLE }).promise();
	const data = result.Items?.map((x) => DynamoDB.Converter.unmarshall(x));
	return { params, data };
}
