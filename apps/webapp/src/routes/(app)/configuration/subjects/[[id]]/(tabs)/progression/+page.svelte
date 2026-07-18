<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getSubjectsPageState } from '../../../subjects-page.svelte';
	import SubjectProgressionTab from './components/SubjectProgressionTab.svelte';
	import { getSubjectProgressionTabState } from './subject-progression-tab.svelte';

	const subjectsPage = getSubjectsPageState();
	const progressionTab = getSubjectProgressionTabState();
	const subject = $derived(subjectsPage.selected);
	const query = $derived(subject ? progressionTab.query(subject.id) : null);
</script>

{#if subject && query}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('subjects.tab.chapters')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<SubjectProgressionTab {subject} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
