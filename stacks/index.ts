import { Stack, StackProps } from 'aws-cdk-lib';
import { DynamoStack } from './dynamodb';
import { ApiGatewayStack } from './api-gateway';
import { SagaLambdaStack } from './saga-lambda';
import { WorkerLambdaStack } from './worker-lambda';
import { SchedulerLambdaStack } from './scheduler-lambda';
import { PageLambdaStack } from './page-lambda';
import { S3BucketStack } from './s3-bucket';
import { Construct } from 'constructs';

interface ServerlessToolkitStackProps extends StackProps {
	stackName: string;
	pkg: {
		stk: {
			domainName?: string;
		};
	};
}

export class ServerlessToolkitStack extends Stack {
	constructor(scope: Construct, id: string, props: ServerlessToolkitStackProps) {
		super(scope, id, props);
		const { pkg, stackName } = props;

		const { table } = new DynamoStack(this, `dynamodb-stack`, {});
		const { codeBucket } = new S3BucketStack(this, `s3bucket-stack`, {
			table
		});
		const { sagaHandler } = new SagaLambdaStack(this, `saga-stack`, {
			table,
			codeBucket
		});
		new SchedulerLambdaStack(this, `scheduler-stack`, {
			table,
			codeBucket,
			sagaHandler
		});
		const { pageHandler } = new PageLambdaStack(this, `page-stack`, {
			table,
			codeBucket
		});
		const { workerHandler } = new WorkerLambdaStack(this, `worker-stack`, {
			table,
			codeBucket
		});
		new ApiGatewayStack(this, `${stackName}-apigateway-stack`, {
			domainName: pkg.stk?.domainName,
			httpRecordName: stackName,
			wsRecordName: `${stackName}-logs`,
			table,
			sagaHandler,
			workerHandler,
			pageHandler
		});
	}
}
