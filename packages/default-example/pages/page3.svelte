<script context="module" lang="ts">
	import { Request } from '@serverless-toolkit/sdk';

	export async function load(request: Request) {
		return { data: request.queryStringParameters };
	}
</script>

<script lang="ts">
	export const title = 'Query Parameters';
	export let data = {};
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
