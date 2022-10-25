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
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IHttpApi, IWebSocketApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export const env = config({ path: join(process.cwd(), '.env') }).parsed;

export interface ServerlessToolkitStackProps extends StackProps {
	projectName: string;
	domainName: string;
	environment?: { [key: string]: string };
}

export class ServerlessToolkitStack extends Stack {
	public readonly tableArn: string;
	public readonly codeBucket: IBucket;
	public readonly sagaHandlerFunctionArn: string;
	public readonly pageHandlerFunctionArn: string;
	public readonly workerHandlerFunctionArn: string;
	public readonly httpApi: IHttpApi;
	public readonly websocketApi: IWebSocketApi;
	public readonly zone: IHostedZone;

	constructor(scope: Construct, id: string, props: ServerlessToolkitStackProps) {
		super(scope, id, props);
		const { environment, projectName, domainName } = props;

		const { table, tableArn } = new DynamoStack(this, `dynamodb-stack`, {});
		this.tableArn = tableArn;

		const { codeBucket } = new S3BucketStack(this, `s3bucket-stack`, {
			table,
			projectName,
		});
		this.codeBucket = codeBucket;

		const { sagaHandler, sagaHandlerFunctionArn } = new SagaLambdaStack(this, `saga-stack`, {
			table,
			codeBucket,
			environment: { ...env, ...environment },
		});
		this.sagaHandlerFunctionArn = sagaHandlerFunctionArn;

		new SchedulerLambdaStack(this, `scheduler-stack`, {
			table,
			codeBucket,
			sagaHandler,
		});

		const { pageHandler, pageHandlerFunctionArn } = new PageLambdaStack(this, `page-stack`, {
			table,
			codeBucket,
			environment: { ...env, ...environment },
		});
		this.pageHandlerFunctionArn = pageHandlerFunctionArn;

		const { workerHandler, workerHandlerFunctionArn } = new WorkerLambdaStack(
			this,
			`worker-stack`,
			{
				table,
				codeBucket,
				environment: { ...env, ...environment },
			}
		);
		this.workerHandlerFunctionArn = workerHandlerFunctionArn;

		const { httpApi, websocketApi, zone } = new ApiGatewayStack(this, `apigateway-stack`, {
			domainName,
			httpRecordName: projectName,
			wsRecordName: `${projectName}-logs`,
			table,
			sagaHandler,
			workerHandler,
			pageHandler,
		});
		this.httpApi = httpApi;
		this.websocketApi = websocketApi;
		this.zone = zone;
	}
}
