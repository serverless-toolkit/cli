const { Confirm } = require('enquirer');
import { existsSync, realpathSync } from 'fs';
import { join } from 'path';
import { Spinner } from 'cli-spinner';
import { ArgumentsCamelCase } from 'yargs';
import * as child_process from 'child_process';
import { promisify } from 'util';
const exec = promisify(child_process.exec);

export async function destroy(argv: ArgumentsCamelCase, env: { [key: string]: string }) {
	const isDestroy = await new Confirm({
		message: `Do you really want to destroy your deployment?`,
		name: 'isDestroy'
	}).run();

	if (!isDestroy) return;

	const spinner = new Spinner({
		text: '%s destroying AWS serverless runtime',
		stream: process.stdout,
		onTick: function (msg: any) {
			this.clearLine(this.stream);
			this.stream.write(msg);
		}
	});
	spinner.start();

	const customDeployFile = join(realpathSync(process.cwd()), 'deploy.js');
	const appFilePath = existsSync(customDeployFile)
		? customDeployFile
		: join(realpathSync(__filename), '..', '..', '..', '.build/stacks/deploy.js');

	const destroy = await exec(
		`npx cdk destroy -f --app ${appFilePath} "*"`
	);

	if (destroy.stderr) {
		console.error(destroy.stderr);
	}

	return destroy;
}
