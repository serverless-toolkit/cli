const { Confirm } = require('enquirer');
import { AwsCdkExec } from 'aws-cdk-exec';
import { realpathSync } from 'fs';
import { join } from 'path';

export async function destroy(argv) {
	const isDestroy = await new Confirm({
		message: `Do you really want to destroy your deployment?`,
		name: 'isDestroy'
	}).run();

	if (!isDestroy) return;

	console.log('Destroying ...');
	const cdkApp = new AwsCdkExec({
		appCommand: join(realpathSync(__filename), '..', '..', '..', '.build/stacks/app.js')
	});
	cdkApp.cdkLocation =
		join(realpathSync(__filename), '..', '..', '..', 'node_modules', '.bin') + '/';

	const destroy = await cdkApp.destroy('"*"');

	if (destroy.stderr) console.error(destroy.stderr);
	console.log(destroy.stdout);
}
