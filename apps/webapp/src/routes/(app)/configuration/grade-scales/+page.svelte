<script lang="ts">
	import GradeScalesView from '$lib/components/school/configuration/GradeScalesView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { queryGradeScalesPage } from '$lib/queries/academic.queries';

	const query = queryGradeScalesPage();
</script>

<PageQuery {query} loadingTitle={$t('config.gradeScales')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('gradeScales.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<GradeScalesView />
		</DataState>
	{/snippet}
</PageQuery>
