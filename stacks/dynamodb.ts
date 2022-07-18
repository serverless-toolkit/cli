import { RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
import {
	Table,
	BillingMode,
	AttributeType,
	StreamViewType} from '@aws-cdk/aws-dynamodb';
import { Construct } from 'constructs';

export class DynamoStack extends Stack {
	table: Table;

	constructor(scope: Construct, id: string, props: StackProps) {
		super(scope, id, props);

		this.table = new Table(this, 'dynamodb-table', {			
			removalPolicy: RemovalPolicy.DESTROY,
			billingMode: BillingMode.PAY_PER_REQUEST,
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING
			},
			sortKey: {
				name: 'type',
				type: AttributeType.STRING
			},
			stream: StreamViewType.NEW_AND_OLD_IMAGES,
			timeToLiveAttribute: 'expiresAt'
		});
	}
}
