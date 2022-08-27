import { AwsCdkExec } from 'aws-cdk-exec';
import { existsSync, readFileSync, realpathSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Spinner } from 'cli-spinner';
import { ArgumentsCamelCase } from 'yargs';
import updateDotenv from 'update-dotenv';

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

	const deploy = await cdkApp.deploy(
		`"*" --outputsFile ${join(__dirname, 'cdk.out', 'cdk-env-vars.json')}`
	);

	if (deploy.stderr) {
		console.error(deploy.stderr);
		process.exit(1);
	}

	try {
		const rawData = readFileSync(join(__dirname, 'cdk.out', 'cdk-env-vars.json')).toString();
		const data = JSON.parse(rawData);
		const out = Object.keys(data).reduce(
			(p, n) => ({
				...p,
				...Object.keys(data[n])
					.filter((x: string) => !x.includes('ExportsOutput'))
					.reduce((p: any, x: string) => {
						p[x.toUpperCase()] = data[n][x];
						return p;
					}, {})
			}),
			{}
		);

		updateDotenv({ ...env, ...out });
		unlinkSync(join(__dirname, 'cdk.out', 'cdk-env-vars.json'));
	} catch {}

	console.log(deploy.stdout);
	process.exit(0);
}
