import { execute } from 'lambda-local';
import { join } from 'path';
import express from 'express';
import * as esbuild from 'esbuild';
import sveltePlugin from 'esbuild-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { mdsvex } from 'mdsvex';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { readFile } from 'fs/promises';

const app = express();
const defaultLambdaConfig = {
	envfile: join(__dirname, '..', '..', '.env'),
	profilePath: '~/.aws/credentials',
	profileName: 'default',
	timeoutMs: 1000,
	verboseLevel: 0
};

app.all('/workers/:name', async function (req, res) {
	const fileContent = (
		await readFile(join(__dirname, 'workers', `${req.params.name}.js`))
	).toString();

	const result = await execute({
		...defaultLambdaConfig,
		event: { rawPath: `/${req.params.name}`, fileContent },
		lambdaPath: join(__dirname, '..', 'worker', 'index.js')
	});

	res.json(result);
});

app.all(['/pages/:name', '/:name'], async function (req, res) {
	const path = join(process.cwd(), 'preview', 'pages', `/${req.params.name}.svx`);

	const buildResult = await esbuild.build({
		entryPoints: [path],
		outbase: './',
		outdir: '.build',
		bundle: true,
		minify: false,
		platform: 'node',
		sourcemap: 'inline',
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
					format: 'cjs'
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

	const [fileContent] = buildResult.outputFiles;
	const result = (await execute({
		...defaultLambdaConfig,
		event: { rawPath: path, fileContent: fileContent.text },
		lambdaPath: join(__dirname, '..', 'page', 'index.js')
	})) as any;

	res.status(result.statusCode).send(result.body);
});

app.listen(4173, () => {
	console.log(`listen on http://localhost:4173`);
});
