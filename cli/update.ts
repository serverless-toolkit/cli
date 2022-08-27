import * as AWS from 'aws-sdk';
import { updateCode } from './utils';

export async function update(argv) {
	const s3 = new AWS.S3();

	console.log('Updating files ...');

	try {
		await updateCode(s3);
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}
