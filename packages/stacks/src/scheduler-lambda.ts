import { realpathSync } from 'fs';
import { join } from 'path';
import { Construct } from 'constructs';
import {
	Duration,
	NestedStack,
	NestedStackProps,
	aws_dynamodb,
	aws_lambda_nodejs,
	aws_s3,
	aws_lambda,
	aws_events,
	aws_events_targets
} from 'aws-cdk-lib';

interface SchedulerLambdaStackProps extends NestedStackProps {
	table: aws_dynamodb.Table;
	sagaHandler: aws_lambda_nodejs.NodejsFunction;
	codeBucket: aws_s3.Bucket;
}

export class SchedulerLambdaStack extends NestedStack {
	schedulerHandler: aws_lambda_nodejs.NodejsFunction;
	eventRule: aws_events.Rule;

	constructor(scope: Construct, id: string, props: SchedulerLambdaStackProps) {
		super(scope, id, props);
		this.schedulerHandler = new aws_lambda_nodejs.NodejsFunction(this, 'SchedulerFunctionHandler', {
			entry: join(realpathSync(__filename), '..', '..', 'scheduler', 'index.ts'),
			depsLockFilePath: join(realpathSync(__filename), '..', '..', 'npm-shrinkwrap.json'),
			projectRoot: join(realpathSync(__filename), '..', '..'),
			awsSdkConnectionReuse: true,
			runtime: aws_lambda.Runtime.NODEJS_16_X,
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

		this.eventRule = new aws_events.Rule(this, 'EventBridgeOneMinuteRule', {
			schedule: aws_events.Schedule.cron({ minute: '0/1' })
		});

		this.eventRule.addTarget(
			new aws_events_targets.LambdaFunction(this.schedulerHandler, {
				event: aws_events.RuleTargetInput.fromObject({ message: '' })
			})
		);
		aws_events_targets.addLambdaPermission(this.eventRule, this.schedulerHandler);
	}
}
