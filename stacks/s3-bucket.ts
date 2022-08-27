import { RemovalPolicy, NestedStack, NestedStackProps, aws_dynamodb, aws_s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface S3BucketStackProps extends NestedStackProps {
	table: aws_dynamodb.Table;
}

export class S3BucketStack extends NestedStack {
	codeBucket: aws_s3.Bucket;

	constructor(scope: Construct, id: string, props: S3BucketStackProps) {
		super(scope, id, props);

		this.codeBucket = new aws_s3.Bucket(this, 'stk-objects-bucket', {
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true
		});
	}
}
