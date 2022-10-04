<script context="module" lang="ts">
	import { Request, Response } from '@serverless-toolkit/sdk';

	export const title = 'Redirect';

	export async function load(request: Request, response: Response) {
		response.statusCode = 302;
		response.headers.location = '/index';
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

# {title}

<style>
</style>
