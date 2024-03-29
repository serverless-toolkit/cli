import { join } from 'path';
import { Construct } from 'constructs';
import {
	Duration,
	aws_dynamodb,
	aws_s3,
	aws_lambda,
	aws_iam,
	aws_lambda_nodejs,
} from 'aws-cdk-lib';
import { realpathSync } from 'fs';

interface SagaLambdaProps {
	table: aws_dynamodb.ITable;
	codeBucket: aws_s3.IBucket;
	environment?: { [key: string]: string };
}
export class SagaLambda extends Construct {
	public readonly sagaHandler: aws_lambda.IFunction;

	constructor(scope: Construct, id: string, props: SagaLambdaProps) {
		super(scope, id);

		this.sagaHandler = new aws_lambda_nodejs.NodejsFunction(this, 'saga-function-handler', {
			entry: join(realpathSync(__filename), '..', '..', 'saga', 'index.ts'),
			depsLockFilePath: join(realpathSync(__filename), '..', '..', 'npm-shrinkwrap.json'),
			projectRoot: join(realpathSync(__filename), '..', '..'),
			awsSdkConnectionReuse: true,
			runtime: aws_lambda.Runtime.NODEJS_16_X,
			memorySize: 256,
			timeout: Duration.minutes(15),
			environment: {
				DBTABLE: props.table.tableName,
				CODEBUCKET: props.codeBucket.bucketName,
				...props.environment,
			},
			bundling: {
				minify: true,
				sourceMap: false,
				nodeModules: ['vm2'],
			},
		});

		props.table.grantReadWriteData(this.sagaHandler);
		props.codeBucket.grantRead(this.sagaHandler);

		const apiGatewayPolicy = new aws_iam.PolicyStatement();
		apiGatewayPolicy.effect = aws_iam.Effect.ALLOW;
		apiGatewayPolicy.addResources('arn:aws:execute-api:*:*:*');
		apiGatewayPolicy.addActions('execute-api:Invoke', 'execute-api:ManageConnections');
		this.sagaHandler.addToRolePolicy(apiGatewayPolicy);
	}
}
