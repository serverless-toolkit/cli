<script context="module" lang="ts">
	import { Request, Response } from '@serverless-toolkit/sdk';

	export const title = 'Get cookies';
	export let data = {};

	export async function load(request: Request, response: Response) {
		data = request.cookies;
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

# {title}

<code>{JSON.stringify(data, null, 4)}</code>

<style>
</style>
