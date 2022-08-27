import { join } from 'path';
import { App, Tags } from 'aws-cdk-lib';
import { ServerlessToolkitStack } from './index';

const env = {
	account: process.env.CDK_DEFAULT_ACCOUNT,
	region: process.env.CDK_DEFAULT_REGION
};

(async () => {
	const pkg = await import(join(process.cwd(), 'package.json'));
	const stackName = pkg.name.replace('@', '').replace('/', '-');

	const app = new App();
	Tags.of(app).add('stk-name', stackName);
	Tags.of(app).add('stk-version', pkg.version);
	Tags.of(app).add('stk-activityAt', new Date().toISOString());

	new ServerlessToolkitStack(app, `${stackName}-serverless-toolkit-stack`, { pkg, stackName, env });
})();
