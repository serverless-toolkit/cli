import { AwsCdkExec } from 'aws-cdk-exec';
import { existsSync, realpathSync } from 'fs';
import { join } from 'path';
import { Spinner } from 'cli-spinner';
import { ArgumentsCamelCase } from 'yargs';

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

	const customDeployFile = join(realpathSync(process.cwd()), 'deploy.js');
	const appCommand = existsSync(customDeployFile)
		? `"node ${customDeployFile}"`
		: join(realpathSync(__filename), '..', '..', '..', '.build/stacks/deploy.js');

	const cdkApp = new AwsCdkExec({ appCommand });
	cdkApp.cdkLocation =
		join(realpathSync(__filename), '..', '..', '..', 'node_modules', '.bin') + '/';

	const deploy = await cdkApp.deploy('"*"');

	if (deploy.stderr) {
		console.error(deploy.stderr);
		process.exit(1);
	}

	console.log(deploy.stdout);
	process.exit(0);
}
