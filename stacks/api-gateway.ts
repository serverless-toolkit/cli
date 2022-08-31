import { join } from 'path';
import { realpathSync } from 'fs';
import { Construct } from 'constructs';
import {
	CfnOutput,
	Duration,
	NestedStack,
	NestedStackProps,
	aws_route53,
	aws_lambda_nodejs,
	aws_lambda,
	aws_certificatemanager,
	aws_dynamodb
} from 'aws-cdk-lib';
import {
	CorsHttpMethod,
	HttpApi,
	HttpMethod,
	WebSocketApi,
	DomainName,
	IDomainName,
	WebSocketStage
} from '@aws-cdk/aws-apigatewayv2-alpha';
import {
	HttpLambdaIntegration,
	WebSocketLambdaIntegration
} from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { IAliasRecordTarget } from 'aws-cdk-lib/aws-route53';

interface ApiGatewayStackProps extends NestedStackProps {
	workerHandler: aws_lambda_nodejs.NodejsFunction;
	sagaHandler: aws_lambda_nodejs.NodejsFunction;
	pageHandler: aws_lambda_nodejs.NodejsFunction;
	table: aws_dynamodb.Table;
	domainName: string;
	httpRecordName: string;
	wsRecordName: string;
}

export class ApiGatewayStack extends NestedStack {
	httpApi: HttpApi;
	websocketApi: WebSocketApi;
	realtimeHandler: aws_lambda_nodejs.NodejsFunction;
	httpApiUrl: string;
	wsApiUrl: string;
	zone: aws_route53.IHostedZone;

	constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
		super(scope, id, props);

		this.httpApiUrl = `${props.httpRecordName}.${props.domainName}`;
		this.wsApiUrl = `${props.wsRecordName}.${props.domainName}`;

		this.zone = aws_route53.HostedZone.fromLookup(this, 'http-api-hosted-zone', {
			domainName: props.domainName
		});

		const httpCertificate = new aws_certificatemanager.Certificate(this, 'http-api-certificate', {
			domainName: this.httpApiUrl,
			validation: aws_certificatemanager.CertificateValidation.fromDns(this.zone)
		});
		const httpCustomDomain = new DomainName(this, 'http-api-domain', {
			certificate: httpCertificate,
			domainName: this.httpApiUrl
		});
		this.httpApi = new HttpApi(this, 'http-api', {
			createDefaultStage: true,
			corsPreflight: {
				allowOrigins: ['*'],
				allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
				allowMethods: [CorsHttpMethod.ANY]
			},
			defaultDomainMapping: {
				domainName: httpCustomDomain
			}
		});

		this.httpApi.addRoutes({
			path: '/workers/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-worker-integration', props.workerHandler)
		});

		this.httpApi.addRoutes({
			path: '/pages/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-pages-integration', props.pageHandler)
		});

		this.httpApi.addRoutes({
			path: '/pages',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-pages-integration', props.pageHandler)
		});

		this.httpApi.addRoutes({
			path: '/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-pages-integration', props.pageHandler)
		});

		this.httpApi.addRoutes({
			path: '/',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-pages-integration', props.pageHandler)
		});

		this.httpApi.addRoutes({
			path: '/sagas/{proxy+}',
			methods: [HttpMethod.ANY],
			integration: new HttpLambdaIntegration('http-api-worker-integration', props.sagaHandler)
		});

		new aws_route53.ARecord(this, 'http-api-alias-record', {
			target: aws_route53.RecordTarget.fromAlias(new ApiGatewayDomain(httpCustomDomain)),
			zone: this.zone,
			recordName: props.httpRecordName
		});

		this.realtimeHandler = new aws_lambda_nodejs.NodejsFunction(this, 'realtime-function-handler', {
			entry: join(realpathSync(__filename), '..', '..', '..', 'realtime', 'index.ts'),
			depsLockFilePath: join(realpathSync(__filename), '..', '..', '..', 'yarn.lock'),
			projectRoot: join(realpathSync(__filename), '..', '..', '..'),
			awsSdkConnectionReuse: true,
			runtime: aws_lambda.Runtime.NODEJS_16_X,
			memorySize: 128,
			timeout: Duration.minutes(1),
			environment: {
				DBTABLE: props.table.tableName
			}
		});
		props.table.grantReadWriteData(this.realtimeHandler);

		const integration = new WebSocketLambdaIntegration(
			'webSocket-api-integration',
			this.realtimeHandler
		);
		this.websocketApi = new WebSocketApi(this, 'websocket-api', {
			connectRouteOptions: { integration },
			disconnectRouteOptions: { integration },
			defaultRouteOptions: { integration }
		});

		const wsCertificate = new aws_certificatemanager.Certificate(
			this,
			'webSocket-api-certificate',
			{
				domainName: this.wsApiUrl,
				validation: aws_certificatemanager.CertificateValidation.fromDns(this.zone)
			}
		);
		const wsCustomDomain = new DomainName(this, 'webSocket-api-domain', {
			certificate: wsCertificate,
			domainName: this.wsApiUrl
		});

		new WebSocketStage(this, 'webSocket-api-stage', {
			webSocketApi: this.websocketApi,
			stageName: 'prod',
			autoDeploy: true,
			domainMapping: { domainName: wsCustomDomain }
		});

		new aws_route53.ARecord(this, 'webSocket-api-alias-record', {
			zone: this.zone,
			target: aws_route53.RecordTarget.fromAlias(new ApiGatewayDomain(wsCustomDomain)),
			recordName: props.wsRecordName
		});

		props.workerHandler.addEnvironment('HTTP_API_URL', this.httpApiUrl);
		props.workerHandler.addEnvironment('WS_API_URL', this.wsApiUrl);
		props.sagaHandler.addEnvironment('HTTP_API_URL', this.httpApiUrl);
		props.sagaHandler.addEnvironment('WS_API_URL', this.wsApiUrl);
		props.pageHandler.addEnvironment('HTTP_API_URL', this.httpApiUrl);
		props.pageHandler.addEnvironment('WS_API_URL', this.wsApiUrl);

		new CfnOutput(this.nestedStackParent || this, 'HTTPAPIURL', {
			value: this.httpApiUrl
		});
		new CfnOutput(this.nestedStackParent || this, 'WSAPIURL', {
			value: this.wsApiUrl
		});
	}
}

class ApiGatewayDomain implements IAliasRecordTarget {
	constructor(private readonly domainName: IDomainName) {}

	public bind(_record: aws_route53.IRecordSet): aws_route53.AliasRecordTargetConfig {
		return {
			dnsName: this.domainName.regionalDomainName,
			hostedZoneId: this.domainName.regionalHostedZoneId
		};
	}
}
