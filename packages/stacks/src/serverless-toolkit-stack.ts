import { config } from 'dotenv';
import { join } from 'path';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Dynamo } from './dynamodb';
import { ApiGateway } from './api-gateway';
import { SagaLambda } from './saga-lambda';
import { WorkerLambda } from './worker-lambda';
import { SchedulerLambda } from './scheduler-lambda';
import { PageLambda } from './page-lambda';
import { S3Bucket } from './s3-bucket';
import { Construct } from 'constructs';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IHttpApi, IHttpRouteAuthorizer, IWebSocketApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export const env = config({ path: join(process.cwd(), '.env') }).parsed;

export interface ServerlessToolkitStackProps extends StackProps {
	projectName: string;
	domainName: string;
	environment?: { [key: string]: string };
	authorizer?: IHttpRouteAuthorizer;
}

export class ServerlessToolkitStack extends Stack {
	public readonly table: ITable;

	public readonly codeBucket: IBucket;
	public readonly sagaHandler: IFunction;
	public readonly pageHandler: IFunction;
	public readonly workerHandler: IFunction;
	public readonly httpApi: IHttpApi;
	public readonly websocketApi: IWebSocketApi;
	public readonly zone: IHostedZone;

	constructor(scope: Construct, id: string, props: ServerlessToolkitStackProps) {
		super(scope, id, props);
		const { environment, projectName, domainName, authorizer } = props;

		const { table } = new Dynamo(this, `dynamodb-stack`);
		this.table = table;
		new CfnOutput(this, 'DBTABLE', {
			value: this.table.tableName,
		});

		const { codeBucket } = new S3Bucket(this, `s3bucket-stack`);
		this.codeBucket = codeBucket;
		new CfnOutput(this, 'CODEBUCKET', {
			value: this.codeBucket.bucketName,
		});

		const { sagaHandler } = new SagaLambda(this, `saga-stack`, {
			table,
			codeBucket,
			environment: { ...env, ...environment },
		});
		this.sagaHandler = sagaHandler;

		new SchedulerLambda(this, `scheduler-stack`, {
			table,
			codeBucket,
			sagaHandler,
		});

		const { pageHandler } = new PageLambda(this, `page-stack`, {
			table,
			codeBucket,
			environment: { ...env, ...environment },
		});
		this.pageHandler = pageHandler;

		const { workerHandler } = new WorkerLambda(this, `worker-stack`, {
			table,
			codeBucket,
			environment: { ...env, ...environment },
		});
		this.workerHandler = workerHandler;

		const { httpApi, websocketApi, zone, httpApiUrl, wsApiUrl, accessLogs } = new ApiGateway(
			this,
			`apigateway-stack`,
			{
				domainName,
				httpRecordName: projectName,
				wsRecordName: `${projectName}-logs`,
				table,
				sagaHandler,
				workerHandler,
				pageHandler,
				authorizer,
			}
		);

		this.httpApi = httpApi;
		this.websocketApi = websocketApi;
		this.zone = zone;
		new CfnOutput(this, 'HTTPAPIURL', {
			value: httpApiUrl,
		});
		new CfnOutput(this, 'WSAPIURL', {
			value: wsApiUrl,
		});
		new CfnOutput(this, 'HTTPAPILOGGROUPNAME', {
			value: accessLogs.logGroupName,
		});
	}
}
