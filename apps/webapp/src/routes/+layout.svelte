<script lang="ts">
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import { bootstrapSession } from '$lib/auth/bootstrap';
	import ApiDevBanner from '$lib/components/dev/ApiDevBanner.svelte';
	import '../app.css';

	const { children } = $props();

	$effect(() => {
		if (!browser) {
			return;
		}
		void bootstrapSession();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Edaya — School Management</title>
</svelte:head>

<ApiDevBanner />

{@render children()}
