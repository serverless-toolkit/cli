import { join } from 'path';
import { realpathSync } from 'fs';
import { Construct } from 'constructs';
import {
	Duration,
	aws_route53,
	aws_lambda_nodejs,
	aws_lambda,
	aws_certificatemanager,
	aws_dynamodb,
	aws_apigateway,
	aws_logs,
	aws_iam,
	RemovalPolicy,
	CfnOutput,
} from 'aws-cdk-lib';
import {
	CorsHttpMethod,
	HttpApi,
	HttpMethod,
	WebSocketApi,
	DomainName,
	IDomainName,
	WebSocketStage,
	IHttpApi,
	IWebSocketApi,
	IHttpRouteAuthorizer,
} from '@aws-cdk/aws-apigatewayv2-alpha';

import {
	HttpLambdaIntegration,
	WebSocketLambdaIntegration,
} from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { IAliasRecordTarget } from 'aws-cdk-lib/aws-route53';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { ServerlessToolkitStack } from './serverless-toolkit-stack';

interface ApiGatewayProps {
	workerHandler: aws_lambda.IFunction;
	sagaHandler: aws_lambda.IFunction;
	pageHandler: aws_lambda.IFunction;
	table: aws_dynamodb.ITable;
	domainName: string;
	httpRecordName: string;
	wsRecordName: string;
	authorizer?: IHttpRouteAuthorizer;
}

export class ApiGateway extends Construct {
	httpApi: IHttpApi;
	websocketApi: IWebSocketApi;
	realtimeHandler: aws_lambda.IFunction;
	httpApiUrl: string;
	wsApiUrl: string;
	zone: aws_route53.IHostedZone;
	accessLogs: aws_logs.ILogGroup;

	constructor(scope: ServerlessToolkitStack, id: string, props: ApiGatewayProps) {
		super(scope, id);

		const { authorizer } = props;
		
		this.httpApiUrl = `${props.httpRecordName}.${props.domainName}`;
		this.wsApiUrl = `${props.wsRecordName}.${props.domainName}`;

		this.zone = aws_route53.HostedZone.fromLookup(this, 'http-api-hosted-zone', {
			domainName: props.domainName,
		});

		const httpCertificate = new aws_certificatemanager.Certificate(this, 'http-api-certificate', {
			domainName: this.httpApiUrl,
			validation: aws_certificatemanager.CertificateValidation.fromDns(this.zone),
		});
		const httpCustomDomain = new DomainName(this, 'http-api-domain', {
			certificate: httpCertificate,
			domainName: this.httpApiUrl,
		});
		this.httpApi = new HttpApi(this, 'http-api', {
			createDefaultStage: true,
			corsPreflight: {
				allowOrigins: ['*'],
				allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
				allowMethods: [CorsHttpMethod.ANY],
			},
			defaultDomainMapping: {
				domainName: httpCustomDomain,
			},
		});

		(this.httpApi as HttpApi).addRoutes({
			path: '/workers/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-worker-integration', props.workerHandler),
			authorizer,
		});

		(this.httpApi as HttpApi).addRoutes({
			path: '/api/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-worker-integration', props.workerHandler),
			authorizer,
		});

		(this.httpApi as HttpApi).addRoutes({
			path: '/pages/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-pages-integration', props.pageHandler),
			authorizer,
		});

		(this.httpApi as HttpApi).addRoutes({
			path: '/pages',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-pages-integration', props.pageHandler),
			authorizer,
		});

		(this.httpApi as HttpApi).addRoutes({
			path: '/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-pages-integration', props.pageHandler),
			authorizer,
		});

		(this.httpApi as HttpApi).addRoutes({
			path: '/',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-pages-integration', props.pageHandler),
			authorizer,
		});

		(this.httpApi as HttpApi).addRoutes({
			path: '/sagas/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-worker-integration', props.sagaHandler),
			authorizer,
		});

		(this.httpApi as HttpApi).addRoutes({
			path: '/object/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-worker-integration', props.sagaHandler),
			authorizer,
		});

		(this.httpApi as HttpApi).addRoutes({
			path: '/objects/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-worker-integration', props.sagaHandler),
			authorizer,
		});

		new aws_route53.ARecord(this, 'http-api-alias-record', {
			target: aws_route53.RecordTarget.fromAlias(new ApiGatewayDomain(httpCustomDomain)),
			zone: this.zone,
			recordName: props.httpRecordName,
		});

		this.realtimeHandler = new aws_lambda_nodejs.NodejsFunction(this, 'realtime-function-handler', {
			entry: join(realpathSync(__filename), '..', '..', 'realtime', 'index.ts'),
			depsLockFilePath: join(realpathSync(__filename), '..', '..', 'npm-shrinkwrap.json'),
			projectRoot: join(realpathSync(__filename), '..', '..'),
			awsSdkConnectionReuse: true,
			runtime: aws_lambda.Runtime.NODEJS_16_X,
			memorySize: 128,
			timeout: Duration.minutes(1),
			environment: {
				DBTABLE: props.table.tableName,
			},
		});
		props.table.grantReadWriteData(this.realtimeHandler);

		const integration = new WebSocketLambdaIntegration(
			'webSocket-api-integration',
			this.realtimeHandler
		);
		this.websocketApi = new WebSocketApi(this, 'websocket-api', {
			connectRouteOptions: { integration },
			disconnectRouteOptions: { integration },
			defaultRouteOptions: { integration },
		});

		const wsCertificate = new aws_certificatemanager.Certificate(
			this,
			'webSocket-api-certificate',
			{
				domainName: this.wsApiUrl,
				validation: aws_certificatemanager.CertificateValidation.fromDns(this.zone),
			}
		);
		const wsCustomDomain = new DomainName(this, 'webSocket-api-domain', {
			certificate: wsCertificate,
			domainName: this.wsApiUrl,
		});

		new WebSocketStage(this, 'webSocket-api-stage', {
			webSocketApi: this.websocketApi,
			stageName: 'prod',
			autoDeploy: true,
			domainMapping: { domainName: wsCustomDomain },
		});

		new aws_route53.ARecord(this, 'webSocket-api-alias-record', {
			zone: this.zone,
			target: aws_route53.RecordTarget.fromAlias(new ApiGatewayDomain(wsCustomDomain)),
			recordName: props.wsRecordName,
		});

		(props.workerHandler as NodejsFunction).addEnvironment('HTTP_API_URL', this.httpApiUrl);
		(props.workerHandler as NodejsFunction).addEnvironment('WS_API_URL', this.wsApiUrl);
		(props.sagaHandler as NodejsFunction).addEnvironment('HTTP_API_URL', this.httpApiUrl);
		(props.sagaHandler as NodejsFunction).addEnvironment('WS_API_URL', this.wsApiUrl);
		(props.pageHandler as NodejsFunction).addEnvironment('HTTP_API_URL', this.httpApiUrl);
		(props.pageHandler as NodejsFunction).addEnvironment('WS_API_URL', this.wsApiUrl);

		this.accessLogs = new aws_logs.LogGroup(this, 'api-gateway-access-logs', {
			retention: aws_logs.RetentionDays.ONE_YEAR,
			removalPolicy: RemovalPolicy.DESTROY,
		});
		const defaultStage = (this.httpApi as HttpApi).defaultStage.node
			.defaultChild as aws_apigateway.CfnStage;
		defaultStage.accessLogSetting = {
			destinationArn: this.accessLogs.logGroupArn,
			format: JSON.stringify({
				requestId: '$context.requestId',
				userAgent: '$context.identity.userAgent',
				sourceIp: '$context.identity.sourceIp',
				requestTime: '$context.requestTime',
				requestTimeEpoch: '$context.requestTimeEpoch',
				httpMethod: '$context.httpMethod',
				path: '$context.path',
				status: '$context.status',
				protocol: '$context.protocol',
				responseLength: '$context.responseLength',
				domainName: '$context.domainName',
				routeKey: '$context.routeKey',
				errorMessage: '$context.integrationErrorMessage',
			}),
		};

		const role = new aws_iam.Role(this, 'api-gateway-log-writer-role', {
			assumedBy: new aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
		});

		role.addToPolicy(
			new aws_iam.PolicyStatement({
				actions: [
					'logs:CreateLogGroup',
					'logs:CreateLogStream',
					'logs:DescribeLogGroups',
					'logs:DescribeLogStreams',
					'logs:PutLogEvents',
					'logs:GetLogEvents',
					'logs:FilterLogEvents',
				],
				resources: ['*'],
			})
		);
		this.accessLogs.grantWrite(role);
	}
}

class ApiGatewayDomain implements IAliasRecordTarget {
	constructor(private readonly domainName: IDomainName) {}

	public bind(_record: aws_route53.IRecordSet): aws_route53.AliasRecordTargetConfig {
		return {
			dnsName: this.domainName.regionalDomainName,
			hostedZoneId: this.domainName.regionalHostedZoneId,
		};
	}
}
