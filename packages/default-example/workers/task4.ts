import { Request, Response } from '@serverless-toolkit/sdk';

export async function GET(request: Request): Promise<Response & { demo: string }> {
	console.log('Task4: Hello World');

	return { demo: 'Hello World!' };
}
