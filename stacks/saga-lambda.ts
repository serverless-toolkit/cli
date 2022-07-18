import { join } from 'path';
import { Table } from '@aws-cdk/aws-dynamodb';
import { Duration, Stack, StackProps } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { Runtime, FunctionUrl } from '@aws-cdk/aws-lambda';
import { Bucket } from '@aws-cdk/aws-s3';
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { realpathSync } from 'fs';

interface SagaLambdaStackProps extends StackProps {
	table: Table;
	codeBucket: Bucket;
}
export class SagaLambdaStack extends Stack {
	sagaHandler: NodejsFunction;
	sagaHandlerUrl: FunctionUrl;

	constructor(scope: Construct, id: string, props: SagaLambdaStackProps) {
		super(scope, id, props);
		this.sagaHandler = new NodejsFunction(this, 'saga-function-handler', {
			entry: join(realpathSync(__filename), '..', '..', '..', 'saga', 'index.ts'),
			depsLockFilePath: join(realpathSync(__filename), '..', '..', '..', 'yarn.lock'),
			projectRoot: join(realpathSync(__filename), '..', '..', '..'),
			awsSdkConnectionReuse: true,
			runtime: Runtime.NODEJS_16_X,
			memorySize: 256,
			timeout: Duration.minutes(15),
			reservedConcurrentExecutions: 1,
			environment: {
				DBTABLE: props.table.tableName,
				CODEBUCKET: props.codeBucket.bucketName
			},
			bundling: {
				nodeModules: ['vm2']
			}
		});
		props.table.grantReadWriteData(this.sagaHandler);
		props.codeBucket.grantRead(this.sagaHandler);

		const apiGatewayPolicy = new PolicyStatement();
		apiGatewayPolicy.effect = Effect.ALLOW;
		apiGatewayPolicy.addResources('arn:aws:execute-api:*:*:*');
		apiGatewayPolicy.addActions('execute-api:Invoke', 'execute-api:ManageConnections');
		this.sagaHandler.addToRolePolicy(apiGatewayPolicy);
	}
}
