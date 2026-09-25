<script lang="ts">
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getEvaluationsPageState } from '../../../evaluations-page.svelte';
	import EvaluationGradingTab from './components/EvaluationGradingTab.svelte';
	import MarksReview from './components/MarksReview.svelte';
	import { getEvaluationGradingTabState } from './evaluation-grading-tab.svelte';

	const evaluationsPage = getEvaluationsPageState();
	const gradingTab = getEvaluationGradingTabState();
	const classId = $derived($page.params.classId ?? '');
	const evaluation = $derived(evaluationsPage.selected);
	const query = $derived(gradingTab.query(classId));
</script>

{#if evaluation}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('eval.tab.grading')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<MarksReview />
				<EvaluationGradingTab {evaluation} {classId} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
