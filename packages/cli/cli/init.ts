const { Input, Confirm, Select } = require('enquirer');
import { mkdirSync } from 'fs';
import { join } from 'path';
import { Spinner } from 'cli-spinner';
import { ArgumentsCamelCase } from 'yargs';
import child_process from 'child_process';
import { promisify } from 'util';
const exec = promisify(child_process.exec);
import AWS from 'aws-sdk';
import replaceAll from 'replace-in-files';

export async function init(argv: ArgumentsCamelCase, env: { [key: string]: string }) {
	const projectName = await new Input({
		message: `Enter your project name:`,
		name: 'projectName'
	}).run();

	const templateName = await new Select({
		message: `Choose a init template:`,
		name: 'templateName',
		choices: ['main', 'custom-stack'],
		default: 'main'
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

	let defaultAWSRegion = 'eu-central-1';
	let defaultAWSAccount = '1234567890';

	if (isGitHubActions) {
		try {
			defaultAWSRegion = (await exec('aws configure get region')).stdout.replace('\n', '');
			defaultAWSAccount = (await new AWS.STS().getCallerIdentity({}).promise()).Account;
		} catch {}
	}

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
			name: 'awsAccount',
			default: defaultAWSAccount
		}).run());
	const awsRegion =
		isGitHubActions &&
		(await new Input({
			message: `Enter your AWS region:`,
			name: 'awsRegion',
			default: defaultAWSRegion
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
	try {
		mkdirSync(join(process.cwd(), projectName));
		const result = await exec(`npx degit serverless-toolkit/init#${templateName}`, {
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

		await exec('yarn', { cwd: join(process.cwd(), projectName) });
	} catch (err) {
		console.error(err.stderr || err.stdout);
	}
	console.log('\r\n');
	console.log(`Project ${projectName} initiated. Change to folder "${projectName}" and enter

> yarn bootstrap

to prepare the development in AWS.`);

	spinner.stop();
	return;
}
