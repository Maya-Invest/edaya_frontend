<script lang="ts">
	import ClassGroupsView from '$lib/components/school/academics/ClassGroupsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { queryClassGroupsPage } from '$lib/queries/academic.queries';

	const query = queryClassGroupsPage();
</script>

<PageQuery {query} loadingTitle={$t('classGroups.subtitle')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('classGroups.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ClassGroupsView />
		</DataState>
	{/snippet}
</PageQuery>
