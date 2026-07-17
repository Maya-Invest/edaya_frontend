<script lang="ts">
	import AcademicAdminView from '$lib/components/school/configuration/AcademicAdminView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { queryAcademicAdminPage } from '$lib/queries/academic.queries';

	const query = queryAcademicAdminPage();
</script>

<PageQuery {query} loadingTitle={$t('config.academic')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('academic.title')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<AcademicAdminView />
		</DataState>
	{/snippet}
</PageQuery>
