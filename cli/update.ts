import * as AWS from 'aws-sdk';
import { updateCode } from './utils';

export async function update(argv) {
	const s3 = new AWS.S3();

	console.log('Updating files ...');

	await updateCode(s3);
}
