import { join } from 'path';
import { App, Tags } from 'aws-cdk-lib';
import { config } from 'dotenv';
import { ServerlessToolkitStack } from './index';

(async () => {
	const environment = config({ path: join(process.cwd(), '.env') }).parsed;
	const pkg = await import(join(process.cwd(), 'package.json'));
	const projectName = environment.PROJECTNAME || pkg.name.replace('@', '').replace('/', '-');
	const domainName = environment.DOMAINNAME || pkg.stk?.domainName;

	const app = new App();
	Tags.of(app).add('stk-name', projectName);
	Tags.of(app).add('stk-version', pkg.version);
	Tags.of(app).add('stk-domainName', environment.DOMAINNAME);
	Tags.of(app).add('stk-activityAt', new Date().toISOString());

	new ServerlessToolkitStack(app, `${projectName}-serverless-toolkit-stack`, {
		env: {
			account: process.env.CDK_DEFAULT_ACCOUNT,
			region: process.env.CDK_DEFAULT_REGION
		},
		environment,
		projectName,
		domainName
	});
})();
