import { RemovalPolicy, NestedStack, StackProps, aws_dynamodb, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class DynamoStack extends NestedStack {
	public readonly table: aws_dynamodb.ITable;
	public readonly tableArn: string;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		this.table = new aws_dynamodb.Table(this, 'dynamodb-table', {
			removalPolicy: RemovalPolicy.DESTROY,
			billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
			partitionKey: {
				name: 'id',
				type: aws_dynamodb.AttributeType.STRING,
			},
			sortKey: {
				name: 'type',
				type: aws_dynamodb.AttributeType.STRING,
			},
			stream: aws_dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
			timeToLiveAttribute: 'expiresAt',
		});

		this.tableArn = this.table.tableArn;

		new CfnOutput(this.nestedStackParent || this, 'DBTABLE', {
			value: this.table.tableName,
		});
	}
}
