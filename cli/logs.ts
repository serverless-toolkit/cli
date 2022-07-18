import { watchLogs } from './utils';

export async function logs(argv) {
	console.log('Watching logs ...');
	await watchLogs();
}
