<script lang="ts">
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getTeachingPageState } from '../../../teaching-page.svelte';
	import SubjectLogbookTab from './components/SubjectLogbookTab.svelte';
	import { querySubjectLogbook } from './subject-logbook';

	const teachingPage = getTeachingPageState();
	const subject = $derived(teachingPage.selected);
	const query = $derived(querySubjectLogbook($page.params.classId ?? '', $page.params.id ?? ''));
</script>

<PageQuery {query} cache={false} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('subjects.tab.logbook')}>
	{#snippet children(data)}
		<DataState status={data.status} errorMessage={data.errorMessage}>
			{#if subject}
				<SubjectLogbookTab {subject} entries={data.entries} />
			{/if}
		</DataState>
	{/snippet}
</PageQuery>
