import { Construct } from 'constructs';
import { Stack, StackProps, aws_route53, aws_certificatemanager } from 'aws-cdk-lib';
import {
	HttpApi,
	DomainName,
	IDomainName,
	ApiMapping,
	HttpStage,
	WebSocketApi,
	WebSocketStage
} from '@aws-cdk/aws-apigatewayv2-alpha';
import { IAliasRecordTarget } from 'aws-cdk-lib/aws-route53';

export interface ApiGatewayCustomDomainStackProps extends StackProps {
	domainName: string;
	httpRecordName: string;
	wsRecordName: string;
	httpApiId: string;
	webSocketId: string;
}

export class ApiGatewayCustomDomainStack extends Stack {
	httpApiUrl: string;
	zone: aws_route53.IHostedZone;
	wsApiUrl: string;
	
	constructor(scope: Construct, id: string, props: ApiGatewayCustomDomainStackProps) {
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

		const httpApi = HttpApi.fromHttpApiAttributes(this, 'http-api', {
			httpApiId: props.httpApiId
		});

		new ApiMapping(this, 'http-api-domain-mapping', {
			api: httpApi,
			domainName: httpCustomDomain,
			stage: HttpStage.fromHttpStageAttributes(this, 'http-api-stage', {
				api: httpApi,
				stageName: '$default'
			})
		});

		new aws_route53.ARecord(this, 'http-api-alias-record', {
			target: aws_route53.RecordTarget.fromAlias(new ApiGatewayDomain(httpCustomDomain)),
			zone: this.zone,
			recordName: props.httpRecordName
		});

		const webSocketApi = WebSocketApi.fromWebSocketApiAttributes(this, 'websocket-api', {
			webSocketId: props.webSocketId
		});

		const wsCertificate = new aws_certificatemanager.Certificate(
			this,
			'websocket-api-certificate',
			{
				domainName: this.wsApiUrl,
				validation: aws_certificatemanager.CertificateValidation.fromDns(this.zone)
			}
		);
		const wsCustomDomain = new DomainName(this, 'websocket-api-domain', {
			certificate: wsCertificate,
			domainName: this.wsApiUrl
		});

		new ApiMapping(this, 'websocket-api-domain-mapping', {
			api: webSocketApi,
			domainName: wsCustomDomain,
			stage: WebSocketStage.fromWebSocketStageAttributes(this, 'websocket-api-stage', {
				api: webSocketApi,
				stageName: 'prod'
			})
		});

		new aws_route53.ARecord(this, 'websocket-api-alias-record', {
			zone: this.zone,
			target: aws_route53.RecordTarget.fromAlias(new ApiGatewayDomain(wsCustomDomain)),
			recordName: props.wsRecordName
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
