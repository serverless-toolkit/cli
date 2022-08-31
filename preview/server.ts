import { execute } from 'lambda-local';
import { join } from 'path';
import express from 'express';

var app = express();

app.all('/workers/:name', async function (req, res) {
	const result = await execute({
		event: { rawPath: `/${req.params.name}`, filePath: join(__dirname, 'workers') },
		lambdaPath: join(__dirname, '..', 'worker', 'index.js'),
		profilePath: '~/.aws/credentials',
		profileName: 'default',
		timeoutMs: 1000,
		verboseLevel: 0
	});

	res.json(result);
});

app.listen(4173, () => {
	console.log(`listen on http://localhost:4173`);
});
