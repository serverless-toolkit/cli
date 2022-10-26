import { realpathSync } from 'fs';
import { join } from 'path';
import { Construct } from 'constructs';
import {
	Duration,
	aws_dynamodb,
	aws_lambda_nodejs,
	aws_s3,
	aws_lambda,
	aws_events,
	aws_events_targets,
} from 'aws-cdk-lib';

interface SchedulerLambdaProps {
	table: aws_dynamodb.ITable;
	sagaHandler: aws_lambda.IFunction;
	codeBucket: aws_s3.IBucket;
}

export class SchedulerLambda extends Construct {
	schedulerHandler: aws_lambda.IFunction;

	constructor(scope: Construct, id: string, props: SchedulerLambdaProps) {
		super(scope, id);
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
				FUNCTION: props.sagaHandler.functionName,
			},
		});

		props.table.grantReadWriteData(this.schedulerHandler);
		props.codeBucket.grantRead(this.schedulerHandler);
		props.sagaHandler.grantInvoke(this.schedulerHandler);

		const eventRule = new aws_events.Rule(this, 'EventBridgeOneMinuteRule', {
			schedule: aws_events.Schedule.cron({ minute: '0/1' }),
		});

		eventRule.addTarget(
			new aws_events_targets.LambdaFunction(this.schedulerHandler, {
				event: aws_events.RuleTargetInput.fromObject({ message: '' }),
			})
		);
		aws_events_targets.addLambdaPermission(eventRule, this.schedulerHandler);
	}
}
