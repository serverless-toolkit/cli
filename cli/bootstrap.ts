import { AwsCdkExec } from 'aws-cdk-exec';
import { realpathSync } from 'fs';
import { join } from 'path';
import { Spinner } from 'cli-spinner';

export async function bootstrap(argv) {
	const spinner = new Spinner({
		text: '%s bootstrapping AWS serverless runtime',
		stream: process.stdout,
		onTick: function (msg: any) {
			this.clearLine(this.stream);
			this.stream.write(msg);
		}
	});
	spinner.start();

	const cdkApp = new AwsCdkExec({
		appCommand: join(realpathSync(__filename), '..', '..', '..', '.build/stacks/app.js')
	});
	cdkApp.cdkLocation =
		join(realpathSync(__filename), '..', '..', '..', 'node_modules', '.bin') + '/';

	const deploy = await cdkApp.deploy('"*"');

	if (deploy.stderr) console.error(deploy.stderr);
	console.log(deploy.stdout);
}
