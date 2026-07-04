<script lang="ts">
	import { page } from '$app/stores';
	import ClassGroupsView from '$lib/components/school/academics/ClassGroupsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryClassGroupsPage } from '$lib/queries/academic.queries';

	const selectedId = $derived($page.params.id);
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
			<ClassGroupsView
				onSelect={cls => appGoto(detailHref.configClassGroup(cls.id))}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
