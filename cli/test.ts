import { runTests } from './utils';

export async function test(argv) {
	console.log('Testing ...');
	await runTests();
}
