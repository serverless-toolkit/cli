const { Input, Confirm } = require('enquirer');
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Spinner } from 'cli-spinner';
import { ArgumentsCamelCase } from 'yargs';
import child_process from 'child_process';
import { promisify } from 'util';
const exec = promisify(child_process.exec);

export async function init(argv: ArgumentsCamelCase, env: { [key: string]: string }) {
	const projectName = await new Input({
		message: `Enter your project name:`,
		name: 'projectName'
	}).run();

	const isRoute53Domain = await new Confirm({
		message: `Do you wanna use Route53 domain?`,
		name: 'isRoute53Domain'
	}).run();

	const domainName =
		isRoute53Domain &&
		(await new Input({
			message: `Enter your Route53 domain name:`,
			name: 'domainName'
		}).run());

	const isGitHubActions = await new Confirm({
		message: `Do you wanna use GitHub actions for deployments?`,
		name: 'isGitHubActions'
	}).run();
	const gitBranchName =
		isGitHubActions &&
		(await new Input({
			message: `Enter your Git branch name:`,
			name: 'gitBranchName'
		}).run());
	const awsAccount =
		isGitHubActions &&
		(await new Input({
			message: `Enter your AWS account number:`,
			name: 'awsAccount'
		}).run());
	const awsRegion =
		isGitHubActions &&
		(await new Input({
			message: `Enter your AWS region:`,
			name: 'awsRegion',
			default: 'eu-central-1'
		}).run());

	if (!projectName) return;

	console.log('\r\n');
	const spinner = new Spinner({
		text: `%s initializing your project ${projectName}`,
		stream: process.stdout,
		onTick: function (msg: any) {
			this.clearLine(this.stream);
			this.stream.write(msg);
		}
	});
	spinner.start();

	if (isGitHubActions) {
		mkdirSync(join(process.cwd(), projectName, '.github/workflows'), { recursive: true });
		writeFileSync(
			join(process.cwd(), projectName, '.github/workflows/deploy.yml'),
			`
name: STK-Examples-Deployment

on:
	push:
	branches: [${gitBranchName}]

env:
	AWS_REGION: "${awsRegion}"
	AWS_ACCOUNT: "${awsAccount}"

permissions:
	id-token: write
	contents: read
jobs:
	deployment:
	runs-on: ubuntu-latest

	steps:
		- name: Git clone the repository
		uses: actions/checkout@v3
		- uses: actions/setup-node@v3
		with:
			node-version: 18
			cache: "npm"
		- name: Get current STK package version
		id: get-stk-pkg-version
		run: |
			echo "::set-output name=version::$(npm view @serverless-toolkit/cli version)"
		shell: bash          
		- name: Cache STK already bootstrapped
		uses: actions/cache@v3
		id: cache
		with:        
			path: .
			key: \${{ steps.get-stk-pkg-version.outputs.version }}            
		- name: Install yarn dependencies
		if: steps.cache.outputs.cache-hit != 'true'
		run: |
			yarn install
		- name: Install STK
		run: |
			npm install -g @serverless-toolkit/cli          
		- name: AWS configure credentials
		uses: aws-actions/configure-aws-credentials@v1
		with:
			role-to-assume: arn:aws:iam::\${{ env.AWS_ACCOUNT }}:role/GitHubActionRole
			role-session-name: stk-examples-deployment
			aws-region: \${{ env.AWS_REGION }}     
		- name: STK bootstrap
		if: steps.cache.outputs.cache-hit != 'true'
		run: |
			stk bootstrap
		- name: STK deploy
		run: |
			stk update
		- name: STK test
		run: |
			stk test          		
		`
		);
	}

	mkdirSync(join(process.cwd(), projectName, 'pages'), { recursive: true });
	mkdirSync(join(process.cwd(), projectName, 'sagas'), { recursive: true });
	mkdirSync(join(process.cwd(), projectName, 'workers'), { recursive: true });
	mkdirSync(join(process.cwd(), projectName, 'tests'), { recursive: true });
	writeFileSync(
		join(process.cwd(), projectName, '.env'),
		`
PROJECTNAME=${projectName}
DOMAINNAME=${domainName}
`
	);
	writeFileSync(
		join(process.cwd(), projectName, 'package.json'),
		JSON.stringify(
			{
				private: true,
				name: projectName,
				version: '1.0.0',
				scripts: {
					sync: 'stk sync',
					bootstrap: 'stk bootstrap',
					destroy: 'stk destroy',
					test: 'stk test'
				},
				dependencies: {},
				devDependencies: {}
			},
			null,
			4
		)
	);
	writeFileSync(
		join(process.cwd(), projectName, 'pages/index.svx'),
		`---
title: Example Page
---

<h1>{title}</h1>

- [Worker 1](workers/worker1)
- [Saga 1](sagas/Example)

`
	);
	writeFileSync(
		join(process.cwd(), projectName, 'sagas/Example.ts'),
		`class Example {
	constructor(params) {
		console.log({ params })
	}	
}
`
	);
	writeFileSync(
		join(process.cwd(), projectName, 'workers/worker1.ts'),
		`async function worker1(params) {
	console.log({ params })
	
	return { 
		message: 'Hello World!', 
		...params
	};
}
`
	);
	writeFileSync(
		join(process.cwd(), projectName, 'tests/workers.spec.ts'),
		`import { test, expect } from '@playwright/test';

test.describe('Workers tests', () => {
	test('task1 should return JSON containing "Hello World!"', async ({ request }) => {
		const response = await request.get('https://${projectName}.${domainName}/workers/worker1');

		expect(await response.json()).toEqual({ message: 'Hello World!' });
	});
});
`
	);
	writeFileSync(
		join(process.cwd(), projectName, '.gitignore'),
		`.DS_Store
node_modules
cdk.out
cdk.context.json
cdk.outputs.json
.env
`
	);
	await exec('npm i --save-dev --no-package-lock aws-sdk ', {
		cwd: join(process.cwd(), projectName)
	});
	await exec(
		'npm i --save --no-package-lock @playwright/test playwright odottaa @serverless-toolkit/cli esbuild',
		{
			cwd: join(process.cwd(), projectName)
		}
	);

	console.log(`
Project ${projectName} initiated. Change to folder ${projectName} and enter

stk bootstrap

to prepare the development in AWS.`);

	process.exit(0);
}
