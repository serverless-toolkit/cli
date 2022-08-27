#!/usr/bin/env node
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { join } from 'path';
import { config } from 'dotenv';
import pkg from '../package.json';
import { test } from './test';
import { bootstrap } from './bootstrap';
import { dev } from './dev';
import { destroy } from './destroy';
import { init } from './init';
import { update } from './update';
import { logs } from './logs';
import updateDotenv from 'update-dotenv';
import { readFileSync, unlinkSync } from 'fs';

const env = config({ path: join(process.cwd(), '.env') }).parsed;
(async () => {
	const argv = await yargs(hideBin(process.argv))
		.env('STK')
		.version(`v${pkg.version}`)
		.alias('v', 'version')
		.demandCommand(1, '')
		.recommendCommands()
		.help()
		.alias('h', 'help')
		.epilogue(['This is ...'].join('\n\n'))
		.usage('Usage: stk COMMAND')
		.command(
			['dev'],
			'Start development.',
			(yargs) => yargs.option('name', { type: 'string', default: false, alias: 'n', desc: '...' }),
			async (argv) => {
				await dev(argv, env);
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
				await logs(argv, env);
			}
		)
		.command(
			['update'],
			'Update code files.',
			() => {},
			async (argv) => {
				await update(argv, env);
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

					const rawData = readFileSync(
						join(process.cwd(), 'cdk.out', 'cdk-env-vars.json')
					).toString();
					const data = JSON.parse(rawData);
					const out = Object.keys(data).reduce(
						(p, n) => ({
							...p,
							...Object.keys(data[n])
								.filter((x: string) => !x.includes('ExportsOutput'))
								.reduce((p: any, x: string) => {
									p[x.toUpperCase()] = data[n][x];
									return p;
								}, {})
						}),
						{}
					);

					await updateDotenv({ ...env, ...out });
					unlinkSync(join(process.cwd(), 'cdk.out', 'cdk-env-vars.json'));
					process.exit(0);
				} catch (err) {
					console.error(err);
					process.exit(1);
				}
			}
		)
		.command(
			['destroy'],
			'Destroy the runtime environment in AWS.',
			() => {},
			async (argv) => {
				await destroy(argv, env);
				process.exit(0);
			}
		)
		.parseAsync();
})();
