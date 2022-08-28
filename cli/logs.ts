import { ArgumentsCamelCase } from 'yargs';
import { watchLogs } from './utils';

export async function logs(
	argv: ArgumentsCamelCase,
	projectName: string,
	domainName: string,
	env: { [key: string]: string }
) {
	console.log('Watching logs ...');

	try {
		await watchLogs(projectName, domainName);
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}
