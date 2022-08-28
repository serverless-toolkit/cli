import * as AWS from 'aws-sdk';
import { ArgumentsCamelCase } from 'yargs';
import { syncCode } from './utils';

export async function sync(
	argv: ArgumentsCamelCase,
	projectName: string,
	env: { [key: string]: string }
) {
	const s3 = new AWS.S3();

	console.log('Updating files ...');

	try {
		await syncCode(projectName, s3);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}
