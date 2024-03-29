import * as chokidar from 'chokidar';
import * as AWS from 'aws-sdk';
import { runTests, compile, watchLogs, syncCode } from './utils';
import { ArgumentsCamelCase } from 'yargs';

export async function dev(
	argv: ArgumentsCamelCase,
	env: { [key: string]: string },
	projectName: string,
	domainName: string
) {
	const s3 = new AWS.S3({ useAccelerateEndpoint: true });

	console.log('Watching ...');

	await watchLogs(projectName, domainName);
	await syncCode(projectName, env, s3);

	chokidar
		.watch(['workers', 'pages', 'sagas', 'tests'], {
			ignoreInitial: true,
			ignored: /(^|[\/\\])\../,
			awaitWriteFinish: true,
		})
		.on('all', async (event, path) => {
			switch (event) {
				case 'addDir':
					break;
				case 'add':
				case 'change':
					if (!path.includes('.spec.ts')) {
						await compile(path, env, s3);
					}
					await runTests(env);
					break;
				case 'unlink':
					console.log(`Delete    : ${path}`);
					await s3
						.deleteObject({
							Bucket: env.CODEBUCKET,
							Key: path,
						})
						.promise();
					break;
				default:
					break;
			}
		});
}
