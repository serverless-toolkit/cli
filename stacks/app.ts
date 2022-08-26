import { join } from 'path';
import { App, Tags } from 'aws-cdk-lib';
import { DynamoStack } from './dynamodb';
import { ApiGatewayStack } from './api-gateway';
import { SagaLambdaStack } from './saga-lambda';
import { WorkerLambdaStack } from './worker-lambda';
import { SchedulerLambdaStack } from './scheduler-lambda';
import { PageLambdaStack } from './page-lambda';
import { S3BucketStack } from './s3-bucket';

const env = {
	account: process.env.CDK_DEFAULT_ACCOUNT,
	region: process.env.CDK_DEFAULT_REGION
};

(async () => {
	const pkg = await import(join(process.cwd(), 'package.json'));
	const pkgName = pkg.name.replace('@', '').replace('/', '-');

	const app = new App({});
	Tags.of(app).add('stk-name', pkgName);
	Tags.of(app).add('stk-version', pkg.version);
	Tags.of(app).add('stk-activityAt', new Date().toISOString());

	const { table } = new DynamoStack(app, `${pkgName}-dynamodb-stack`, { env });
	const { codeBucket } = new S3BucketStack(app, `${pkgName}-s3bucket-stack`, {
		pkg,
		table,
		env
	});
	const { sagaHandler } = new SagaLambdaStack(app, `${pkgName}-saga-stack`, {
		table,
		codeBucket,
		env
	});
	new SchedulerLambdaStack(app, `${pkgName}-scheduler-stack`, {
		table,
		codeBucket,
		sagaHandler,
		env
	});
	const { pageHandler } = new PageLambdaStack(app, `${pkgName}-page-stack`, {
		table,
		codeBucket,
		env
	});
	const { workerHandler } = new WorkerLambdaStack(app, `${pkgName}-worker-stack`, {
		table,
		codeBucket,
		env
	});
	new ApiGatewayStack(app, `${pkgName}-apigateway-stack`, {
		domainName: pkg.stk?.domainName,
		httpRecordName: pkgName,
		wsRecordName: `${pkgName}-logs`,
		table,
		sagaHandler,
		workerHandler,
		pageHandler,
		env
	});
})();
