<script context="module" lang="ts">
	import DynamoDB from 'aws-sdk/clients/dynamodb';
	import { Request, Response } from '@serverless-toolkit/sdk';

	export const title = 'Load data from DynamoDB using Svelte and Markdown';

	export async function load(request: Request, response: Response) {
		const ddb = new DynamoDB();
		const result = await ddb.scan({ TableName: process.env.DBTABLE }).promise();
		return result.Items?.map((x) => DynamoDB.Converter.unmarshall(x));
	}
</script>

<script lang="ts">
	export let data = [];
</script>

<svelte:head>
	<title>{title}</title>
	<link rel="stylesheet" href="global.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.28.0/themes/prism.min.css"
		integrity="sha512-tN7Ec6zAFaVSG3TpNAKtk4DOHNpSwKHxxrsiw4GHKESGPs5njn/0sMCUMl2svV4wo4BK/rCP7juYz+zx+l6oeQ=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	/>
	<script
		src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.28.0/components/prism-core.min.js"
		integrity="sha512-9khQRAUBYEJDCDVP2yw3LRUQvjJ0Pjx0EShmaQjcHa6AXiOv6qHQu9lCAIR8O+/D8FtaCoJ2c0Tf9Xo7hYH01Q=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"></script>
	<script
		src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.28.0/plugins/autoloader/prism-autoloader.min.js"
		integrity="sha512-fTl/qcO1VgvKtOMApX2PdZzkziyr2stM65GYPLGuYMnuMm1z2JLJG6XVU7C/mR+E7xBUqCivykuhlzfqxXBXbg=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"></script>
</svelte:head>

<h1>{title}</h1>

{#if !data.length}
	<p>No data found in table.</p>
{:else}
	<ul>
		{#each data as { id, value }}
			<li>{id} - {value}</li>
		{/each}
	</ul>
{/if}

<style>
	h1 {
		color: blue;
	}
</style>
