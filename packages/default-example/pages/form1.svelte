<script context="module" lang="ts">
	import { Request } from '@serverless-toolkit/sdk';

	export const title = 'HTML form submit';

	export async function load(request: Request) {
		return request.body || {};
	}
</script>

<script lang="ts">
	export let fname = '';
	export let lname = '';
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<h1>{title}</h1>

<form method="post">
	<label for="fname">First name:</label><br />
	<input type="text" id="fname" name="fname" value={fname} /><br />
	<label for="lname">Last name:</label><br />
	<input type="text" id="lname" name="lname" value={lname} /><br />
	<input type="submit" value="Submit" />
</form>

<div>
	Your input was:
	<div>Firstname: {fname}</div>
	<div>Lastname: {lname}</div>
</div>

<style>
	h1 {
		color: blue;
	}
</style>
