import { realpathSync } from 'fs';
import { join } from 'path';
import { Construct } from 'constructs';
import {
	Duration,
	Stack,
	StackProps,
	aws_dynamodb,
	aws_lambda,
	aws_lambda_nodejs,
	aws_s3,
	aws_iam
} from 'aws-cdk-lib';

interface WorkerLambdaStackProps extends StackProps {
	table: aws_dynamodb.Table;
	codeBucket: aws_s3.Bucket;
}
export class WorkerLambdaStack extends Stack {
	workerHandler: aws_lambda_nodejs.NodejsFunction;
	workerHandlerUrl: aws_lambda.FunctionUrl;

	constructor(scope: Construct, id: string, props: WorkerLambdaStackProps) {
		super(scope, id, props);

		this.workerHandler = new aws_lambda_nodejs.NodejsFunction(this, 'worker-function-handler', {
			entry: join(realpathSync(__filename), '..', '..', '..', 'worker', 'index.ts'),
			depsLockFilePath: join(realpathSync(__filename), '..', '..', '..', 'yarn.lock'),
			projectRoot: join(realpathSync(__filename), '..', '..', '..'),
			awsSdkConnectionReuse: true,
			runtime: aws_lambda.Runtime.NODEJS_16_X,
			memorySize: 256,
			timeout: Duration.minutes(15),
			environment: {
				DBTABLE: props.table.tableName,
				CODEBUCKET: props.codeBucket.bucketName
			},
			bundling: {
				nodeModules: ['vm2']
			}
		});
		props.table.grantReadWriteData(this.workerHandler);
		props.codeBucket.grantRead(this.workerHandler);

		const apiGatewayPolicy = new aws_iam.PolicyStatement();
		apiGatewayPolicy.effect = aws_iam.Effect.ALLOW;
		apiGatewayPolicy.addResources('arn:aws:execute-api:*:*:*');
		apiGatewayPolicy.addActions('execute-api:Invoke', 'execute-api:ManageConnections');
		this.workerHandler.addToRolePolicy(apiGatewayPolicy);
	}
}
