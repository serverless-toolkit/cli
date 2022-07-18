import { AwsCdkExec } from 'aws-cdk-exec';
import { realpathSync } from 'fs';
import { join } from 'path';

export async function bootstrap(argv) {
	console.log('Bootstrapping ...');

	const cdkApp = new AwsCdkExec({
		appCommand: join(realpathSync(__filename), '..', '..', '..', '.build/stacks/app.js')
	});
	cdkApp.cdkLocation =
		join(realpathSync(__filename), '..', '..', '..', 'node_modules', '.bin') + '/';

	const deploy = await cdkApp.deploy('"*"');

	if (deploy.stderr) console.error(deploy.stderr);
	console.log(deploy.stdout);
}
