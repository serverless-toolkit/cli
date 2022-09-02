const { Input, Confirm } = require('enquirer');
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Spinner } from 'cli-spinner';
import { ArgumentsCamelCase } from 'yargs';
import child_process from 'child_process';
import { promisify } from 'util';
const exec = promisify(child_process.exec);
import replaceAll from 'replace-in-files';

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
		text: `%s initializing your project ${projectName}\r\n`,
		stream: process.stdout,
		onTick: function (msg: any) {
			this.clearLine(this.stream);
			this.stream.write(msg);
		}
	});
	spinner.start();
	console.log(join(process.cwd(), projectName));
	mkdirSync(join(process.cwd(), projectName));
	const result = await exec(`npx degit serverless-toolkit/init`, {
		cwd: join(process.cwd(), projectName),
		maxBuffer: 1000 * 1000 * 150
	});
	const files = [`${projectName}/**/*`, `${projectName}/**/.*`, `${projectName}/.github/**/*`];

	await replaceAll({ files, from: /\$\{projectName\}/g, to: projectName });
	await replaceAll({ files, from: /\$\{domainName\}/g, to: domainName || '' });
	await replaceAll({ files, from: /\$\{awsRegion\}/g, to: awsRegion || '' });
	await replaceAll({ files, from: /\$\{awsAccount\}/g, to: awsAccount || '' });
	await replaceAll({
		files,
		from: /\$\{gitBranchName\}/g,
		to: gitBranchName || ''
	});

	spinner.stop();
	return;
}

/*
	if (isGitHubActions) {
		mkdirSync(join(process.cwd(), projectName, '.github/workflows'), { recursive: true });
		writeFileSync(
			join(process.cwd(), projectName, '.github/workflows/deploy.yml'),
			`
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
					test: 'stk test',
					dev: 'stk dev',
					logs: 'stk logs'
				},
				dependencies: { 'aws-sdk': 'latest' },
				devDependencies: {
					'@serverless-toolkit/cli': 'latest',
					'@playwright/test': 'latest',
					odottaa: 'latest',
					playwright: 'latest',
					'aws-cdk': 'latest'
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

<svelte:head>
	<title>{title}</title>
</svelte:head>

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
		`import { Request, Response } from "@serverless-toolkit/cli";

async function worker1(request: Request): Promise<Response> {
	
	return { 
		message: 'Hello World!'
	};
}
`
	);
	writeFileSync(
		join(process.cwd(), projectName, 'tests/pages.spec.ts'),
		`import { test, expect } from '@playwright/test';

test.describe('Page tests', () => {
  test('page index.svx should have title "Example Page"', async ({
    page,
  }) => {
    await page.goto(\`https://\${process.env.PROJECTNAME}.\${process.env.DOMAINNAME}\`);

    await expect(page).toHaveTitle('Example Page');
  });
});
`
	);
	writeFileSync(
		join(process.cwd(), projectName, 'tests/workers.spec.ts'),
		`import { test, expect } from '@playwright/test';
import playwrightApiMatchers from 'odottaa';
expect.extend(playwrightApiMatchers);

test.describe('Workers tests', () => {
	test('task1 should match JSON { "message": "Hello World!" }', async ({ request }) => {
		const response = await request.get(\`https://\${process.env.PROJECTNAME}.\${process.env.DOMAINNAME}/workers/worker1\`);

		await expect(response).toHaveStatusCode(200);
		await expect(response).toMatchJSON({ message: 'Hello World!' });		
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

	try {
		const yarn = await exec('yarn', { cwd: join(process.cwd(), projectName) });
	} catch (err) {
		console.error(err.stderr || err.stdout);
	}

	console.log(`Project ${projectName} initiated. Change to folder "${projectName}" and enter

> stk bootstrap

to prepare the development in AWS.`);
*/
