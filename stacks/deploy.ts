import { join } from 'path';
import { App, Tags } from 'aws-cdk-lib';
import { config } from 'dotenv';
import { ServerlessToolkitStack } from './index';

(async () => {
	const environment = config({ path: join(process.cwd(), '.env') }).parsed;
	const pkg = await import(join(process.cwd(), 'package.json'));
	const projectName = pkg.name.replace('@', '').replace('/', '-');
	const env = {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION
	};

	const app = new App();
	Tags.of(app).add('stk-name', projectName);
	Tags.of(app).add('stk-version', pkg.version);
	Tags.of(app).add('stk-version', pkg.version);
	Tags.of(app).add('stk-domainName', pkg.stk?.domainName);
	Tags.of(app).add('stk-activityAt', new Date().toISOString());

	new ServerlessToolkitStack(app, `${projectName}-serverless-toolkit-stack`, {
		pkg,
		projectName,
		env,
		environment
	});
})();
