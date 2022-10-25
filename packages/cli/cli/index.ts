#!/usr/bin/env node
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { join } from 'path';
import { config } from 'dotenv';
import stkPkg from '../package.json';
import { test } from './test';
import { bootstrap } from './bootstrap';
import { dev } from './dev';
import { destroy } from './destroy';
import { init } from './init';
import { sync } from './sync';
import { logs } from './logs';
import updateDotenv from 'update-dotenv';
import { existsSync, readFileSync } from 'fs';

const env = {
	PROJECTNAME: process.env.PROJECTNAME,
	DOMAINNAME: process.env.DOMAINNAME,
	...config({ path: join(process.cwd(), '.env') }).parsed,
};

(async () => {
	const pkg = await import(join(process.cwd(), 'package.json')).catch(() => ({}));
	const projectName = env?.PROJECTNAME || pkg?.name?.replace('@', '').replace('/', '-');
	const domainName = env?.DOMAINNAME || pkg?.stk?.domainName;

	const argv = await yargs(hideBin(process.argv))
		.env('STK')
		.version(`v${stkPkg.version}`)
		.alias('v', 'version')
		.demandCommand(1, '')
		.recommendCommands()
		.help()
		.alias('h', 'help')
		.epilogue(
			[
				'Serverless application development runtime that deploys to your AWS account using the AWS-CDK.',
			].join('\n\n')
		)
		.usage('Usage: stk COMMAND')
		.command(
			['dev'],
			'Start development.',
			(yargs) => yargs.option('name', { type: 'string', default: false, alias: 'n', desc: '...' }),
			async (argv) => {
				await dev(argv, env, projectName, domainName);
			}
		)
		.command(
			['test'],
			'Start local test execution.',
			() => {},
			async (argv) => {
				await test(argv, env);
			}
		)
		.command(
			['logs'],
			'Watch logs.',
			() => {},
			async (argv) => {
				await logs(argv, projectName, domainName, env);
			}
		)
		.command(
			['sync'],
			'sync code files.',
			() => {},
			async (argv) => {
				await sync(argv, projectName, env);
			}
		)
		.command(
			['init'],
			'Prepare a local development environment.',
			() => {},
			async (argv) => {
				await init(argv, env);
			}
		)
		.command(
			['bootstrap'],
			'Bootstrap the runtime environment in AWS.',
			(yargs) => yargs.option('now', { type: 'boolean', default: false, alias: 'd', desc: '...' }),
			async (argv) => {
				try {
					await bootstrap(argv, env);
					const fileName = join(process.cwd(), 'cdk.out', 'cdk-env-vars.json');
					const rawData = existsSync(fileName) && readFileSync(fileName).toString();
					const data = JSON.parse(rawData || '{}');
					const out = Object.keys(data).reduce(
						(p, n) => ({
							...p,
							...Object.keys(data[n])
								.filter((x: string) => !x.includes('ExportsOutput'))
								.reduce((p: any, x: string) => {
									p[x.toUpperCase()] = data[n][x];
									return p;
								}, {}),
						}),
						{}
					);

					await updateDotenv({ ...env, ...out });
				} catch (err) {
					console.error(err);
				}
			}
		)
		.command(
			['destroy'],
			'Destroy the runtime environment in AWS.',
			() => {},
			async (argv) => {
				await destroy(argv, env);
			}
		)
		.parseAsync();
})();
