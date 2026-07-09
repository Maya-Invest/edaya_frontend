<script lang="ts">
	import { browser } from '$app/environment';
	import { checkBrowserApiHealth } from '$lib/api/check-api-health';
	import { isLocalDevApi } from '$lib/env/app-env';

	type ApiStatus = { connected: true; message: string } | { connected: false };

	let status = $state<ApiStatus>({ connected: false });

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

	const show = $derived(isLocalDevApi() && !status.connected);
</script>

{#if show}
	<div
		role="status"
		class="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-900 dark:text-amber-200"
	>
		Local API unreachable — run <code class="font-mono">cd ../edaya_backend && bun dev</code>
	</div>
{/if}
