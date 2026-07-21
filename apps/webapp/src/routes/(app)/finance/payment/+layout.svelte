<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import PaymentsList from './components/PaymentsList.svelte';
	import {
		PaymentPageState,
		setPaymentPageState,
	} from './payment-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const paymentPage = new PaymentPageState();
	setPaymentPageState(paymentPage);
	registerVersionInvalidation(paymentPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = paymentPage.queryListPage();
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('finance.payments')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('finance.payments')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<PaymentsList />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
