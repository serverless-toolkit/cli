import { existsSync, realpathSync } from 'fs';
import { join } from 'path';
import { Spinner } from 'cli-spinner';
import { ArgumentsCamelCase } from 'yargs';
import * as child_process from 'child_process';
import { promisify } from 'util';
const exec = promisify(child_process.exec);

export async function bootstrap(argv: ArgumentsCamelCase, env: { [key: string]: string }) {
	const spinner = new Spinner({
		text: '%s bootstrapping AWS serverless runtime',
		stream: process.stdout,
		onTick: function (msg: any) {
			this.clearLine(this.stream);
			this.stream.write(msg);
		}
	});
	spinner.start();

	const customDeployFile = join(realpathSync(process.cwd()), 'stacks', 'deploy.js');
	const appFilePath = existsSync(customDeployFile)
		? customDeployFile
		: join(realpathSync(__filename), '..', '..', '..', '.build/stacks/deploy.js');
		
	const globalPath = join(
		realpathSync(__filename),
		'..',
		'..',
		'..',
		'node_modules',
		'.bin',
		'cdk'
	);
	const appCommand = existsSync(globalPath)
		? globalPath
		: join(realpathSync(__filename), '..', '..', '..', '..', '..', 'aws-cdk', 'bin', 'cdk');

	const deploy = await exec(
		`npx cdk --no-color deploy --require-approval never --outputsFile ${join(
			process.cwd(),
			'cdk.out',
			'cdk-env-vars.json'
		)} --app ${appFilePath} "*"`
	);

	if (deploy.stderr) {
		console.error(deploy.stderr);
	}

	return deploy;
}
