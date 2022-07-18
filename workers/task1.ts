async function task1(params: any) {
	console.log('Hello from Gusto!');
	return { demo: 'Hello from Gusto!', ...params };
}
