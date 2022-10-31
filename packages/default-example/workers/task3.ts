import { DynamoDB } from 'aws-sdk';
import { Request, Response } from '@serverless-toolkit/sdk';

interface Task3Result {
	params: any;
	data: { [key: string]: any } | undefined;
}

export async function GET(request: Request): Promise<Response & Task3Result> {
	const ddb = new DynamoDB();
	const result = await ddb.scan({ TableName: process.env.DBTABLE! }).promise();
	const data = result.Items?.map((x) => DynamoDB.Converter.unmarshall(x));
	return { params: request.body, data };
}
