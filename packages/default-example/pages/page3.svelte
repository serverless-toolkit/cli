<script context="module" lang="ts">
	import { Request } from '@serverless-toolkit/sdk';

	export const title = 'Query Parameters';
	export let data = {};

	export async function load(request: Request) {
		data = request.queryStringParameters || {};
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<h1>{title}</h1>

<code>
	{JSON.stringify(data, null, 4)}
</code>

<style>
</style>
