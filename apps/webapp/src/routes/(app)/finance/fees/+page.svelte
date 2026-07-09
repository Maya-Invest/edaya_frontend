<script lang="ts">
	import FeesView from '$lib/components/school/finance/FeesView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { queryFinancePage } from '$lib/queries/finance.queries';

	const query = queryFinancePage();
</script>

<PageQuery {query} loadingTitle={$t('finance.fees')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('finance.fees')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<FeesView />
		</DataState>
	{/snippet}
</PageQuery>
