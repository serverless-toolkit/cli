import { config } from 'dotenv';
import { join } from 'path';
import { CfnOutput, Stack, StackProps, aws_lambda } from 'aws-cdk-lib';
import { ServerlessToolkit } from './serverless-toolkit';
import { Construct } from 'constructs';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IHttpApi, IWebSocketApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';

export const env = config({ path: join(process.cwd(), '.env') }).parsed;

export interface ServerlessToolkitStackProps extends StackProps {
	projectName: string;
	domainName: string;
	environment?: { [key: string]: string };
	authorizerHandler?: aws_lambda.IFunction;
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
	public readonly accessLogs: ILogGroup;
	public readonly wsApiUrl: string;
	public readonly httpApiUrl: string;

	constructor(scope: Construct, id: string, props: ServerlessToolkitStackProps) {
		super(scope, id, props);

		const {
			codeBucket,
			table,
			httpApi,
			websocketApi,
			pageHandler,
			workerHandler,
			sagaHandler,
			zone,
			accessLogs,
			httpApiUrl,
			wsApiUrl,
		} = new ServerlessToolkit(this, 'serverless-toolkit', props);

		this.codeBucket = codeBucket;
		this.table = table;
		this.httpApi = httpApi;
		this.websocketApi = websocketApi;
		this.pageHandler = pageHandler;
		this.workerHandler = workerHandler;
		this.sagaHandler = sagaHandler;
		this.zone = zone;
		this.accessLogs = accessLogs;
		this.httpApiUrl = httpApiUrl;
		this.wsApiUrl = wsApiUrl;

		new CfnOutput(this, 'HTTPAPIURL', {
			value: this.httpApiUrl,
		});
		new CfnOutput(this, 'WSAPIURL', {
			value: this.wsApiUrl,
		});
		new CfnOutput(this, 'HTTPAPILOGGROUPNAME', {
			value: this.accessLogs.logGroupName,
		});
		new CfnOutput(this, 'HTTPAPIURL', {
			value: this.httpApiUrl,
		});
		new CfnOutput(this, 'DBTABLE', {
			value: this.table.tableName,
		});
		new CfnOutput(this, 'CODEBUCKET', {
			value: this.codeBucket.bucketName,
		});
	}
}
