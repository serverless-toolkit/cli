import { Request, Response } from '../../lib/types';

export async function worker1(request: Request, response: Response): Promise<any> {
	console.log({ request, response });

	return {
		value: 'Hello World!'
	};
}
