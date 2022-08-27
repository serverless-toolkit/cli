import * as AWS from 'aws-sdk';
import { ArgumentsCamelCase } from 'yargs';
import { updateCode } from './utils';

export async function update(argv: ArgumentsCamelCase, env: { [key: string]: string }) {
	const s3 = new AWS.S3();

	console.log('Updating files ...');

	try {
		await updateCode(s3);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}
