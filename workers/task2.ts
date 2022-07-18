import crypto from 'crypto';
import randomstring from 'randomstring';

export async function task2(params: any) {
	console.log('Hello World!');

	return { demo: 'Hello World!', id: crypto.randomUUID(), slug: randomstring.generate() };
}
