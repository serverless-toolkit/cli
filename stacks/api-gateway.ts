import { CfnOutput, Duration, Stack, StackProps } from '@aws-cdk/core';
import { Construct } from 'constructs';
import {
	HostedZone,
	ARecord,
	RecordTarget,
	AliasRecordTargetConfig,
	IAliasRecordTarget,
	IRecordSet
} from '@aws-cdk/aws-route53';
import {
	CorsHttpMethod,
	HttpApi,
	HttpMethod,
	WebSocketApi,
	DomainName,
	IDomainName,
	WebSocketStage
} from '@aws-cdk/aws-apigatewayv2';
import {
	HttpLambdaIntegration,
	WebSocketLambdaIntegration
} from '@aws-cdk/aws-apigatewayv2-integrations';
import { Runtime } from '@aws-cdk/aws-lambda';
import { Certificate, CertificateValidation } from '@aws-cdk/aws-certificatemanager';
import { Table } from '@aws-cdk/aws-dynamodb';
import { join } from 'path';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { realpathSync } from 'fs';

interface ApiGatewayStackProps extends StackProps {
	workerHandler: NodejsFunction;
	sagaHandler: NodejsFunction;
	pageHandler: NodejsFunction;
	table: Table;
	domainName: string;
	httpRecordName: string;
	wsRecordName: string;
}

export class ApiGatewayStack extends Stack {
	httpApi: HttpApi;
	websocketApi: WebSocketApi;
	realtimeHandler: NodejsFunction;
	httpApiUrl: string;
	wsApiUrl: string;

	constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
		super(scope, id, props);

		this.httpApiUrl = `${props.httpRecordName}.${props.domainName}`;
		this.wsApiUrl = `${props.wsRecordName}.${props.domainName}`;

		const zone = HostedZone.fromLookup(this, 'http-api-hosted-zone', {
			domainName: props.domainName
		});

		const httpCertificate = new Certificate(this, 'http-api-certificate', {
			domainName: this.httpApiUrl,
			validation: CertificateValidation.fromDns(zone)
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

		new CfnOutput(this, 'http-api-wndpoint-utl', { value: this.httpApi.apiEndpoint });

		new ARecord(this, 'http-api-alias-record', {
			target: RecordTarget.fromAlias(new ApiGatewayDomain(httpCustomDomain)),
			zone,
			recordName: props.httpRecordName
		});

		this.realtimeHandler = new NodejsFunction(this, 'realtime-function-handler', {
			entry: join(realpathSync(__filename), '..', '..', '..', 'realtime', 'index.ts'),
			depsLockFilePath: join(realpathSync(__filename), '..', '..', '..', 'yarn.lock'),
			projectRoot: join(realpathSync(__filename), '..', '..', '..'),
			awsSdkConnectionReuse: true,
			runtime: Runtime.NODEJS_16_X,
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

		new CfnOutput(this, 'webSocket-api-endpoint-url', { value: this.websocketApi.apiEndpoint });

		const wsCertificate = new Certificate(this, 'webSocket-api-certificate', {
			domainName: this.wsApiUrl,
			validation: CertificateValidation.fromDns(zone)
		});
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

		new ARecord(this, 'webSocket-api-alias-record', {
			zone,
			target: RecordTarget.fromAlias(new ApiGatewayDomain(wsCustomDomain)),
			recordName: props.wsRecordName
		});

		props.workerHandler.addEnvironment('HTTP_API_URL', this.httpApiUrl);
		props.workerHandler.addEnvironment('WS_API_URL', this.wsApiUrl);
		props.sagaHandler.addEnvironment('HTTP_API_URL', this.httpApiUrl);
		props.sagaHandler.addEnvironment('WS_API_URL', this.wsApiUrl);
		props.pageHandler.addEnvironment('HTTP_API_URL', this.httpApiUrl);
		props.pageHandler.addEnvironment('WS_API_URL', this.wsApiUrl);
	}
}

class ApiGatewayDomain implements IAliasRecordTarget {
	constructor(private readonly domainName: IDomainName) {}

	public bind(_record: IRecordSet): AliasRecordTargetConfig {
		return {
			dnsName: this.domainName.regionalDomainName,
			hostedZoneId: this.domainName.regionalHostedZoneId
		};
	}
}
