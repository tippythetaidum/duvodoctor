<script lang="ts">
	import { page } from '$app/state';
	import NotFound from '$lib/components/NotFound.svelte';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Not found' : 'Something went wrong'} | Duvo Doctor</title>
</svelte:head>

{#if page.status === 404}
	<NotFound />
{:else}
	<h1>Something went wrong</h1>
	<p>{page.error?.message ?? 'The page hit an error.'} <a href="/">Back to the Doctor</a>.</p>
{/if}
