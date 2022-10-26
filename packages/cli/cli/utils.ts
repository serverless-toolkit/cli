import * as chokidar from 'chokidar';
import { join } from 'path';
import * as esbuild from 'esbuild';
import sveltePlugin from 'esbuild-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { sassPlugin } from 'esbuild-sass-plugin';
import { mdsvex } from 'mdsvex';
import * as AWS from 'aws-sdk';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import WsClient from 'ws-reconnect';
import * as child_process from 'child_process';
import { promisify } from 'util';
const exec = promisify(child_process.exec);

export async function runTests(env: { [key: string]: any }): Promise<void> {
	try {
		const { stdout } = await exec(`npx playwright test --reporter json`, {
			env: {
				...process.env,
				...env,
			},

			maxBuffer: 1024 * 1024 * 150,
		});
		testReport(JSON.parse(stdout));
	} catch (err) {
		testReport(JSON.parse(err.stdout));
	}
}

export async function compile(path: string, env: { [key: string]: any }, s3: AWS.S3) {
	const outDir = join(process.cwd(), '.build');
	const isSvelte = path.includes('.svelte') || path.includes('.svx');
	const define = {};

	for (const k in env) {
		define[`process.env.${k}`] = JSON.stringify(env[k]);
	}

	console.log(`Compile   : ${path}`);
	const buildCSRResult =
		isSvelte &&
		(await esbuild.build({
			stdin: {
				contents: `import App from "./${path}";
	window.addEventListener("load", () => {
	  new App({ target: document.body, hydrate: true, props: __data });
	});`,
				resolveDir: process.cwd(),
				sourcefile: 'App.ts',
				loader: 'ts',
			},
			bundle: true,
			define: {
				...define,
				global: 'window',
			},
			mainFields: ['svelte', 'browser', 'module', 'main'],
			logLevel: 'error',
			minify: true,
			sourcemap: false,
			write: false,
			outbase: './',
			outdir: '.build',
			treeShaking: true,
			plugins: [
				sassPlugin(),
				sveltePlugin({
					include: /\.svx|.svelte$/,
					compilerOptions: { css: false, hydratable: true },
					preprocess: [
						mdsvex({ extensions: ['.svx'] }),
						sveltePreprocess(),
						{
							markup({ content }) {
								const scriptRegex =
									/<script context="module"(?:(?!\/\/)(?!\/\*)[^'"]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*(?:\n)|\/\*(?:(?:.|\s))*?\*\/)*?<\/script>/gi;

								return {
									code: content.replace(scriptRegex, ''),
								};
							},
						},
					],
				}),
			],
		}));

	for (const file of buildCSRResult?.outputFiles || []) {
		if (file.path.includes('stdin.js')) {
			const fileName = path.replace('.svelte', '.csr.js').replace('.svx', '.csr.js');
			file.path = file.path.replace(`${outDir}/`, '').replace('stdin.js', fileName);
			console.log(`Upload    : ${file.path}`);
			await s3
				.putObject({
					Bucket: env.CODEBUCKET,
					Key: file.path,
					Body: file.contents,
				})
				.promise();
		}

		//TODO: upload empty css file for imports
		file.path = path.replace('.svelte', '.css').replace('.svx', '.css');
		console.log(`Upload    : ${file.path}`);
		await s3
			.putObject({
				Bucket: env.CODEBUCKET,
				Key: file.path,
				Body: '',
			})
			.promise();
	}

	const buildResult = await esbuild.build({
		entryPoints: [path],
		logLevel: 'error',
		outbase: './',
		outdir: '.build',
		bundle: true,
		minify: false,
		platform: 'node',
		sourcemap: false,
		target: 'node16',
		write: false,
		treeShaking: true,
		define,
		plugins: [
			nodeExternalsPlugin({
				devDependencies: false,
			}),
			sassPlugin(),
			sveltePlugin({
				compilerOptions: {
					dev: false,
					immutable: true,
					css: false,
					hydratable: true,
					format: 'cjs',
					generate: 'ssr',
				},
				include: /\.svx|.svelte$/,
				preprocess: [mdsvex({ extensions: ['.svx'] }), sveltePreprocess()],
			}),
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
			'.pdf': 'copy',
			'.yml': 'copy',
		},
	});

	for (const file of buildResult.outputFiles) {
		file.path = file.path.replace(`${outDir}/`, '');
		console.log(`Upload    : ${file.path}`);

		await s3
			.putObject({
				Bucket: env.CODEBUCKET,
				Key: file.path,
				Body: file.contents,
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

export async function syncCode(projectName: string, env: { [key: string]: any }, s3: AWS.S3) {
	chokidar
		.watch(['workers', 'pages', 'sagas'], {
			ignoreInitial: false,
			ignored: /(^|[\/\\])\../,
			persistent: false,
		})
		.on('all', async (event, path) => {
			if (event !== 'add') return;
			await compile(path, env, s3);
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
