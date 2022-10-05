<script>
	export const title = 'Svelte Component';
	function handle() {
		console.log('Hello World!');
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<h1>{title}</h1>

<button on:click={handle}>Press Me!</button>

<style>
</style>
