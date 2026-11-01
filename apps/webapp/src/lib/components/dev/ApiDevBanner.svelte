<script lang="ts">
	import { browser } from '$app/environment';
	import { checkBrowserApiHealth } from '$lib/api/check-api-health';
	import { isLocalDevApi } from '$lib/env/app-env';

	type ApiStatus = { connected: true; message: string } | { connected: false };

	let status = $state<ApiStatus | null>(null);

	$effect(() => {
		if (!browser || !isLocalDevApi())
			return;

		let cancelled = false;

		async function refresh() {
			const next = await checkBrowserApiHealth();
			if (!cancelled)
				status = next;
		}

		void refresh();
		const interval = setInterval(refresh, 10_000);

		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	});

	const show = $derived(isLocalDevApi() && status?.connected === false);
</script>

{#if show}
	<div
		role="status"
		class="border-b border-highlight/30 bg-highlight-soft px-4 py-1.5 text-center text-xs text-highlight"
	>
		Local identity/API unreachable — run <code class="font-mono">bun repo dev</code> in <code class="font-mono">edaya_backend</code>
	</div>
{/if}
