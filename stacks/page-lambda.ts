import { realpathSync } from 'fs';
import { join } from 'path';
import { Construct } from 'constructs';
import {
	Duration,
	NestedStack,
	NestedStackProps,
	aws_dynamodb,
	aws_lambda,
	aws_lambda_nodejs,
	aws_s3,
	aws_iam
} from 'aws-cdk-lib';

interface PageLambdaStackProps extends NestedStackProps {
	table: aws_dynamodb.Table;
	codeBucket: aws_s3.Bucket;
}
export class PageLambdaStack extends NestedStack {
	pageHandler: aws_lambda_nodejs.NodejsFunction;

	constructor(scope: Construct, id: string, props: PageLambdaStackProps) {
		super(scope, id, props);

		this.pageHandler = new aws_lambda_nodejs.NodejsFunction(this, 'page-function-handler', {
			entry: join(realpathSync(__filename), '..', '..', '..', 'page', 'index.ts'),
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
				nodeModules: ['svelte', 'mdsvex', 'mime-types', 'lambda-multipart-parser', 'vm2']
			}
		});
		props.table.grantReadWriteData(this.pageHandler);
		props.codeBucket.grantRead(this.pageHandler);

		const apiGatewayPolicy = new aws_iam.PolicyStatement();
		apiGatewayPolicy.effect = aws_iam.Effect.ALLOW;
		apiGatewayPolicy.addResources('arn:aws:execute-api:*:*:*');
		apiGatewayPolicy.addActions('execute-api:Invoke', 'execute-api:ManageConnections');
		this.pageHandler.addToRolePolicy(apiGatewayPolicy);
	}
}
