<script lang="ts">
	import { page } from '$app/stores';
	import GradeLevelsView from '$lib/components/school/configuration/GradeLevelsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryGradeLevelsPage } from '$lib/queries/academic.queries';

	const selectedId = $derived($page.params.id);
	const query = queryGradeLevelsPage();
</script>

<PageQuery {query} loadingTitle={$t('gradeLevels.subtitle')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('gradeLevels.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<GradeLevelsView
				onSelect={level => appGoto(detailHref.configGradeLevel(level.id))}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
