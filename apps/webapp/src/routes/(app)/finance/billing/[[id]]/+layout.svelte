<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { financeReadKey } from '$lib/api/finance-workspace';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { untrack } from 'svelte';
	import { getBillingPageState } from '../billing-page.svelte';
	import BillingDetail from './components/BillingDetail.svelte';
	import BillingDrawer from './components/BillingDrawer.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();
	const state = getBillingPageState();
	const query = state.queryDetail();
	let generation = academicContext.scopeGeneration;
	$effect(() => {
		if (generation !== academicContext.scopeGeneration) {
			generation = academicContext.scopeGeneration;
			untrack(() => {
				state.clear();
				closeDetailDrawer(listSurfaceHref('/finance/billing', $page.url));
			});
		}
	});
</script>
{#if $page.params.id}
	<BillingDrawer onClose={() => closeDetailDrawer(listSurfaceHref('/finance/billing', $page.url))}>
		<PageQuery {query} cache={false} cacheKey={() => financeReadKey(`charge:${$page.params.id}`)}>
			{#snippet children(data)}
				<DataState status={data.status} errorMessage={data.errorMessage}>
					{#if data.billing}<BillingDetail billing={data.billing} />{/if}
				</DataState>
			{/snippet}
		</PageQuery>
	</BillingDrawer>
{/if}

{@render pageChildren()}
