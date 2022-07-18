import { join } from 'path';
import { Table } from '@aws-cdk/aws-dynamodb';
import { Duration, Stack, StackProps } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { Runtime, FunctionUrl } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Bucket } from '@aws-cdk/aws-s3';
import { realpathSync } from 'fs';

interface WorkerLambdaStackProps extends StackProps {
	table: Table;
	codeBucket: Bucket;
}
export class WorkerLambdaStack extends Stack {
	workerHandler: NodejsFunction;
	workerHandlerUrl: FunctionUrl;

	constructor(scope: Construct, id: string, props: WorkerLambdaStackProps) {
		super(scope, id, props);

		this.workerHandler = new NodejsFunction(this, 'worker-function-handler', {
			entry: join(realpathSync(__filename), '..', '..', '..', 'worker', 'index.ts'),
			depsLockFilePath: join(realpathSync(__filename), '..', '..', '..', 'yarn.lock'),
			projectRoot: join(realpathSync(__filename), '..', '..', '..'),
			awsSdkConnectionReuse: true,
			runtime: Runtime.NODEJS_16_X,
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

		const apiGatewayPolicy = new PolicyStatement();
		apiGatewayPolicy.effect = Effect.ALLOW;
		apiGatewayPolicy.addResources('arn:aws:execute-api:*:*:*');
		apiGatewayPolicy.addActions('execute-api:Invoke', 'execute-api:ManageConnections');
		this.workerHandler.addToRolePolicy(apiGatewayPolicy);
	}
}
