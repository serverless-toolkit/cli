import { ArgumentsCamelCase } from 'yargs';
import { watchLogs } from './utils';

export async function logs(argv: ArgumentsCamelCase, env: { [key: string]: string }) {
	console.log('Watching logs ...');

	try {
		await watchLogs();
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}
