import * as chokidar from 'chokidar';
import childProcess from 'child_process';
import { join } from 'path';
import { realpathSync } from 'fs';
import * as esbuild from 'esbuild';
import sveltePlugin from 'esbuild-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { mdsvex } from 'mdsvex';
import * as AWS from 'aws-sdk';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import WsClient from 'ws-reconnect';

export async function runTests() {
	return new Promise((resolve, reject) => {
		let content = '';
		const pw = childProcess.spawn(
			join(realpathSync(__filename), '..', '..', '..', 'node_modules', 'playwright', 'cli.js'),
			['test', '--reporter', 'json']
		);

		pw.stdout.on('data', (data) => {
			content += data.toString();
		});
		pw.on('exit', () => {
			try {
				const testResult = JSON.parse(content);
				testReport(testResult);
				resolve(testResult);
			} catch (err) {
				reject(err);
			}
		});
	});
}

export async function compile(path: string, projectName: string, s3: AWS.S3) {
	const outDir = join(process.cwd(), '.build');

	console.log(`Compile   : ${path}`);
	const buildResult = await esbuild.build({
		entryPoints: [path],
		outbase: './',
		outdir: '.build',
		bundle: true,
		minify: false,
		platform: 'node',
		sourcemap: true,
		target: 'node16',
		write: false,
		treeShaking: false,
		plugins: [
			nodeExternalsPlugin({
				devDependencies: false
			}),
			sveltePlugin({
				compilerOptions: {
					generate: 'ssr',
					format: 'cjs',
					sveltePath: join(realpathSync(__filename), '..', '..', '..', 'node_modules', 'svelte')
				},
				include: /\.svx|.svelte$/,
				preprocess: [sveltePreprocess(), mdsvex()]
			})
		],
		loader: {
			'.css': 'copy',
			'.json': 'copy',
			'.png': 'copy',
			'.jpg': 'copy',
			'.jpeg': 'copy',
			'.svg': 'copy',
			'.webp': 'copy',
			'.bmp': 'copy',
			'.tiff': 'copy',
			'.ico': 'copy',
			'.gif': 'copy',
			'.aac': 'copy',
			'.mp3': 'copy',
			'.mp4': 'copy',
			'.avi': 'copy',
			'.pdf': 'copy'
		}
	});

	for (const file of buildResult.outputFiles) {
		file.path = file.path.replace(`${outDir}/`, '');
		console.log(`Upload    : ${file.path}`);
		await s3
			.putObject({
				Bucket: `stk-objects-${projectName}`,
				Key: file.path,
				Body: file.contents
			})
			.promise();
	}
}

export async function watchLogs(projectName: string, domainName: string) {
	const wsclient = new WsClient(`wss://${projectName}-logs.${domainName}`);
	wsclient.start();
	wsclient.on('message', function (data) {
		try {
			data = JSON.parse(data);
		} catch {}
		console.log(`Log       : ${data.timestamp} - ${data.message}`);
	});
}

export async function updateCode(projectName: string, s3: AWS.S3) {
	chokidar
		.watch(['workers', 'pages', 'sagas'], {
			ignoreInitial: false,
			ignored: /(^|[\/\\])\../,
			persistent: false
		})
		.on('all', async (event, path) => {
			if (event !== 'add') return;
			await compile(path, projectName, s3);
		});
}

function testReport(data) {
	for (const spec of data.specs || []) {
		if (spec.ok) console.log(`              * Success - ${spec.title}`);
		if (!spec.ok) {
			console.log(`              * Failed - ${spec.title}`);
			const errors = spec.tests.reduce((prev, next) => {
				prev += next.results[0].error.message;
				return prev;
			}, '          ');
			console.log(errors);
		}
	}

	for (const suite of data.suites || []) {
		console.log(`Spec      : ${suite.title}`);
		if (suite.specs) {
			testReport(suite);
			continue;
		}
		if (suite.suites) {
			testReport(suite);
			continue;
		}
	}
}
