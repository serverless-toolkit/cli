import { ArgumentsCamelCase } from 'yargs';
import { runTests } from './utils';

export async function test(argv: ArgumentsCamelCase, env: { [key: string]: string }) {
	console.log('Testing ...');

	try {
		await runTests();
	} catch (err) {
		console.error(err);
	}
}
