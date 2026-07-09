<script lang="ts">
	import DisciplinaryCatalogView from '$lib/components/school/configuration/DisciplinaryCatalogView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { queryDisciplineCatalogPage } from '$lib/queries/discipline-catalog.queries';

	const query = queryDisciplineCatalogPage();
</script>

<PageQuery {query} loadingTitle={$t('config.discipline')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('disciplinaryCatalog.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<DisciplinaryCatalogView />
		</DataState>
	{/snippet}
</PageQuery>
