import { RemovalPolicy, NestedStack, StackProps, aws_dynamodb } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class DynamoStack extends NestedStack {
	table: aws_dynamodb.Table;

	constructor(scope: Construct, id: string, props: StackProps) {
		super(scope, id, props);

		this.table = new aws_dynamodb.Table(this, 'dynamodb-table', {
			removalPolicy: RemovalPolicy.DESTROY,
			billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
			partitionKey: {
				name: 'id',
				type: aws_dynamodb.AttributeType.STRING
			},
			sortKey: {
				name: 'type',
				type: aws_dynamodb.AttributeType.STRING
			},
			stream: aws_dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
			timeToLiveAttribute: 'expiresAt'
		});
	}
}
