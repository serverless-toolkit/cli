import * as chokidar from 'chokidar';
import * as AWS from 'aws-sdk';
import { runTests, compile, watchLogs, updateCode } from './utils';
import { join } from 'path';
import { ArgumentsCamelCase } from 'yargs';

export async function dev(argv: ArgumentsCamelCase, env: { [key: string]: string }) {
	const s3 = new AWS.S3();
	const pkg = await import(join(process.cwd(), 'package.json'));
	const pkgName = pkg.name.replace('@', '').replace('/', '-');

	console.log('Watching ...');

	await watchLogs();
	await updateCode(s3);

	chokidar
		.watch(['workers', 'pages', 'sagas', 'tests'], {
			ignoreInitial: true,
			ignored: /(^|[\/\\])\../,
			awaitWriteFinish: true
		})
		.on('all', async (event, path) => {
			switch (event) {
				case 'addDir':
					break;
				case 'add':
				case 'change':
					if (!path.includes('.spec.ts')) {
						await compile(path, s3);
					}
					await runTests();
					break;
				case 'unlink':
					console.log(`Delete    : ${path}`);
					await s3
						.deleteObject({
							Bucket: `stk-objects-${pkgName}`,
							Key: path
						})
						.promise();
					break;
				default:
					break;
			}
		});
}
