import { RemovalPolicy, aws_s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class S3Bucket extends Construct {
	codeBucket: aws_s3.IBucket;

	constructor(scope: Construct, id: string) {
		super(scope, id);

		this.codeBucket = new aws_s3.Bucket(this, 'stk-objects-bucket', {
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			transferAcceleration: true,
		});
	}
}
