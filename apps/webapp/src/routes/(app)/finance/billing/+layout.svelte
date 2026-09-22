<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		BillingPageState,
		setBillingPageState,
	} from './billing-page.svelte';
	import BillingList from './components/BillingList.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const billingPage = new BillingPageState(() => $page.url);
	setBillingPageState(billingPage);
	registerVersionInvalidation(billingPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const selectedId = $derived(billingPage.selectedId);
	const query = billingPage.queryListPage();

	function selectBilling(billing: import('$lib/types/school').StudentBilling) {
		const path = detailHref.financeBilling(billing.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('finance.title')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('finance.title')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<BillingList {selectedId} onSelectBilling={selectBilling} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
