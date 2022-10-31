import { Request, Response } from '@serverless-toolkit/sdk';

export async function GET(request: Request): Promise<Response & { demo: string }> {
	console.log('Task1: Hello from Gusto!');

	return { demo: 'Hello from Gusto!', ...request.body };
}
