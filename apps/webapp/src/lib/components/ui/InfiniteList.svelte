<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from '$lib/i18n';

	const {
		hasMore = false,
		loading = false,
		total = 0,
		visibleCount = 0,
		showEndSummary = true,
		onLoadMore,
		children,
	}: {
		hasMore?: boolean;
		loading?: boolean;
		total?: number;
		visibleCount?: number;
		showEndSummary?: boolean;
		onLoadMore?: () => void;
		children?: Snippet;
	} = $props();

	let sentinel = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const node = sentinel;
		if (!node || !hasMore || !onLoadMore || loading)
			return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting)
					onLoadMore();
			},
			{ rootMargin: '240px' },
		);

		observer.observe(node);
		return () => observer.disconnect();
	});
</script>

<div aria-busy={loading}>
	{@render children?.()}
	{#if hasMore}
		<div data-testid="list-load-more-sentinel" bind:this={sentinel} class="h-px" aria-hidden="true"></div>
		<p class="py-4 text-center text-xs text-muted-foreground" aria-live="polite">
			{$t('list.loadingMore')}
		</p>
	{:else if showEndSummary && total > 0 && visibleCount >= total}
		<p class="py-3 text-center text-xs text-muted-foreground" aria-live="polite">
			{$t('list.endOfList', { n: total })}
		</p>
	{/if}
</div>
