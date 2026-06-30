<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import TeachingLogView from '$lib/components/school/academics/TeachingLogView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryClassTeachingPage } from '$lib/queries/subjects.queries';

	const selectedSubjectId = $derived($page.params.id);
	const classId = $derived($page.params.classId ?? '6a');
	const query = $derived(queryClassTeachingPage(classId));

	function selectSubject(subject: Subject) {
		const path = detailHref.classTeachingSubject(classId, subject.id);
		appGoto(`${path}${$page.url.search}`);
	}
</script>

<PageQuery {query} loadingTitle={$t('tab.teaching')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.teaching')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<TeachingLogView
				classId={data.classId}
				onSelectSubject={selectSubject}
				{selectedSubjectId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
