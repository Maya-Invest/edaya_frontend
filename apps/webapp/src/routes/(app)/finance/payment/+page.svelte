<script lang="ts">
	import PaymentsView from '$lib/components/school/finance/PaymentsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { queryPaymentsPage } from '$lib/queries/finance.queries';

	const query = queryPaymentsPage();
</script>

<PageQuery {query} loadingTitle={$t('finance.payments')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('finance.payments')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<PaymentsView />
		</DataState>
	{/snippet}
</PageQuery>
