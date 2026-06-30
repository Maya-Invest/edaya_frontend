<script lang="ts">
	import { page } from '$app/stores';
	import FinanceView from '$lib/components/school/finance/FinanceView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryFinancePage } from '$lib/queries/finance.queries';

	const selectedId = $derived($page.params.id);
	const query = queryFinancePage();
</script>

<PageQuery {query} loadingTitle={$t('finance.billing')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('finance.billing')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<FinanceView
				forcedTab="billing"
				onSelectBilling={b => appGoto(detailHref.financeBilling(b.id))}
				onSelectFee={f => appGoto(detailHref.financeFee(f.id))}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
