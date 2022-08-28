import { config } from 'dotenv';
import { join } from 'path';
import { Stack, StackProps } from 'aws-cdk-lib';
import { DynamoStack } from './dynamodb';
import { ApiGatewayStack } from './api-gateway';
import { SagaLambdaStack } from './saga-lambda';
import { WorkerLambdaStack } from './worker-lambda';
import { SchedulerLambdaStack } from './scheduler-lambda';
import { PageLambdaStack } from './page-lambda';
import { S3BucketStack } from './s3-bucket';
import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { HttpApi, WebSocketApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';

export const env = config({ path: join(process.cwd(), '.env') }).parsed;

interface ServerlessToolkitStackProps extends StackProps {
	projectName: string;
	domainName: string;
	environment?: { [key: string]: string };
}

export class ServerlessToolkitStack extends Stack {
	public table: Table;
	public codeBucket: Bucket;
	public sagaHandler: NodejsFunction;
	public pageHandler: NodejsFunction;
	public workerHandler: NodejsFunction;
	public httpApi: HttpApi;
	public websocketApi: WebSocketApi;
	public zone: IHostedZone;

	constructor(scope: Construct, id: string, props: ServerlessToolkitStackProps) {
		super(scope, id, props);
		const { environment, projectName, domainName } = props;

		const { table } = new DynamoStack(this, `dynamodb-stack`, {});
		this.table = table;
		const { codeBucket } = new S3BucketStack(this, `s3bucket-stack`, {
			table,
			projectName
		});
		this.codeBucket = codeBucket;
		const { sagaHandler } = new SagaLambdaStack(this, `saga-stack`, {
			table,
			codeBucket,
			environment: { ...env, ...environment }
		});
		this.sagaHandler = sagaHandler;
		new SchedulerLambdaStack(this, `scheduler-stack`, {
			table,
			codeBucket,
			sagaHandler
		});
		const { pageHandler } = new PageLambdaStack(this, `page-stack`, {
			table,
			codeBucket,
			environment: { ...env, ...environment }
		});
		this.pageHandler = pageHandler;
		const { workerHandler } = new WorkerLambdaStack(this, `worker-stack`, {
			table,
			codeBucket,
			environment: { ...env, ...environment }
		});
		this.workerHandler = workerHandler;
		const { httpApi, websocketApi, zone } = new ApiGatewayStack(this, `apigateway-stack`, {
			domainName,
			httpRecordName: projectName,
			wsRecordName: `${projectName}-logs`,
			table,
			sagaHandler,
			workerHandler,
			pageHandler
		});
		this.httpApi = httpApi;
		this.websocketApi = websocketApi;
		this.zone = zone;
	}
}
