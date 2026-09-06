<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import { bootstrapAuthOnly, bootstrapSession } from '$lib/auth/bootstrap';
	import { shouldBootstrapAuthOnly } from '$lib/auth/bootstrap-route';
	import ApiDevBanner from '$lib/components/dev/ApiDevBanner.svelte';
	import ToastHost from '$lib/components/ui/ToastHost.svelte';
	import '../app.css';

	const { children } = $props();

	$effect(() => {
		if (!browser) {
			return;
		}

		const pathname = $page.url.pathname;
		if (shouldBootstrapAuthOnly(pathname)) {
			void bootstrapAuthOnly();
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

<ToastHost />
