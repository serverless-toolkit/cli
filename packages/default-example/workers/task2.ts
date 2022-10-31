import crypto from 'crypto';
import randomstring from 'randomstring';
import { Request, Response } from '@serverless-toolkit/sdk';

interface Taks2Result {
	demo: string;
	id: string;
	slug: string;
}

export async function GET(request: Request): Promise<Response & Taks2Result> {
	console.log('Task2: Hello World!');

	return {
		demo: 'Hello World!',
		id: crypto.randomUUID(),
		slug: randomstring.generate(),
	};
}
