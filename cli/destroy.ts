const { Confirm } = require('enquirer');
import { AwsCdkExec } from 'aws-cdk-exec';
import { existsSync, realpathSync } from 'fs';
import { join } from 'path';
import { Spinner } from 'cli-spinner';

export async function destroy(argv) {
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
	const appCommand = existsSync(customDeployFile)
		? customDeployFile
		: join(realpathSync(__filename), '..', '..', '..', '.build/stacks/deploy.js');

	const cdkApp = new AwsCdkExec({ appCommand });
	cdkApp.cdkLocation =
		join(realpathSync(__filename), '..', '..', '..', 'node_modules', '.bin') + '/';

	const destroy = await cdkApp.destroy('"*"');

	if (destroy.stderr) {
		console.error(destroy.stderr);
		process.exit(1);
	}

	console.log(destroy.stdout);
	process.exit(0);
}
