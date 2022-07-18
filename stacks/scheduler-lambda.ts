import { join } from 'path';
import { Table } from '@aws-cdk/aws-dynamodb';
import { Duration, Stack, StackProps } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { Runtime } from '@aws-cdk/aws-lambda';
import { Rule, Schedule, RuleTargetInput } from '@aws-cdk/aws-events';
import { addLambdaPermission, LambdaFunction } from '@aws-cdk/aws-events-targets';
import { Bucket } from '@aws-cdk/aws-s3';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { realpathSync } from 'fs';

interface SchedulerLambdaStackProps extends StackProps {
	table: Table;
	sagaHandler: NodejsFunction;
	codeBucket: Bucket;
}

export class SchedulerLambdaStack extends Stack {
	schedulerHandler: NodejsFunction;
	eventRule: Rule;

	constructor(scope: Construct, id: string, props: SchedulerLambdaStackProps) {
		super(scope, id, props);
		this.schedulerHandler = new NodejsFunction(this, 'SchedulerFunctionHandler', {
			entry: join(realpathSync(__filename), '..', '..', '..', 'scheduler', 'index.ts'),
			depsLockFilePath: join(realpathSync(__filename), '..', '..', '..', 'yarn.lock'),
			projectRoot: join(realpathSync(__filename), '..', '..', '..'),
			awsSdkConnectionReuse: true,
			runtime: Runtime.NODEJS_16_X,
			memorySize: 128,
			timeout: Duration.minutes(1),
			environment: {
				DBTABLE: props.table.tableName,
				CODEBUCKET: props.codeBucket.bucketName,
				FUNCTION: props.sagaHandler.functionName
			}
		});

		props.table.grantReadWriteData(this.schedulerHandler);
		props.codeBucket.grantRead(this.schedulerHandler);
		props.sagaHandler.grantInvoke(this.schedulerHandler);

		this.eventRule = new Rule(this, 'EventBridgeOneMinuteRule', {
			schedule: Schedule.cron({ minute: '0/1' })
		});

		this.eventRule.addTarget(
			new LambdaFunction(this.schedulerHandler, {
				event: RuleTargetInput.fromObject({ message: '' })
			})
		);
		addLambdaPermission(this.eventRule, this.schedulerHandler);
	}
}
