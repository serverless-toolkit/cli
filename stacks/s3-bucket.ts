import { Table } from '@aws-cdk/aws-dynamodb';
import { RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { Bucket } from '@aws-cdk/aws-s3';

interface S3BucketStackProps extends StackProps {
	table: Table;
	pkg: {
		name: string;
	};
}

export class S3BucketStack extends Stack {
	codeBucket: Bucket;

	constructor(scope: Construct, id: string, props: S3BucketStackProps) {
		super(scope, id, props);

		this.codeBucket = new Bucket(this, 'stk-objects-bucket', {
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			bucketName: `${props.pkg?.name.replace('@', '').replace('/', '-')}-stk-objects`
		});
	}
}
