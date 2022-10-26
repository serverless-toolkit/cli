import {
	RemovalPolicy,
	NestedStackProps,
	aws_dynamodb,
	aws_s3,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface S3BucketStackProps extends NestedStackProps {
	table: aws_dynamodb.ITable;
	projectName: string;
}

export class S3BucketStack extends Construct {
	codeBucket: aws_s3.IBucket;

	constructor(scope: Construct, id: string, props: S3BucketStackProps) {
		super(scope, id);

		this.codeBucket = new aws_s3.Bucket(this, 'stk-objects-bucket', {
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			bucketName: `stk-objects-${props.projectName}`,
			transferAcceleration: true,
		});
	}
}
