<script lang="ts">
	import { page } from '$app/stores';
	import HomeworkView from '$lib/components/school/academics/HomeworkView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryClassHomeworkPage } from '$lib/queries/homework.queries';

	const selectedId = $derived($page.params.id);
	const classId = $derived($page.params.classId ?? '6a');
	const query = $derived(queryClassHomeworkPage(classId));
</script>

<PageQuery {query} loadingTitle={$t('tab.homework')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.homework')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<HomeworkView
				classId={data.classId}
				onSelect={d => appGoto(detailHref.classDeadline(data.classId, d.id))}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
