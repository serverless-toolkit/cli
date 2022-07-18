const npm = require('npm-programmatic');
const { Input, Confirm } = require('enquirer');
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function init(argv) {
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
			name: 'projectName'
		}).run());

	const isGitHubActions = await new Confirm({
		message: `Do you wanna use GitHub actions for deployments?`,
		name: 'isGitHubActions'
	}).run();

	if (!projectName) return;

	mkdirSync(join(process.cwd(), projectName, 'pages'), { recursive: true });
	mkdirSync(join(process.cwd(), projectName, 'sagas'), { recursive: true });
	mkdirSync(join(process.cwd(), projectName, 'workers'), { recursive: true });
	mkdirSync(join(process.cwd(), projectName, 'tests'), { recursive: true });
	writeFileSync(
		join(process.cwd(), projectName, 'package.json'),
		JSON.stringify(
			{
				private: true,
				name: projectName,
				version: '1.0.0',
				dependencies: {},
				stk: {
					domainName
				}
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
		`
	);
	await npm.install(['@playwright/test@1.23.4'], {
		cwd: join(process.cwd(), projectName),
		save: false
	});

	console.log(`
Project ${projectName} initiated. Change to folder ${projectName} and enter

stk bootstrap

to prepare the development in AWS.`);
}
