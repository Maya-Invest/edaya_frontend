<script lang="ts">
	import { page } from '$app/stores';
	import EvaluationsView from '$lib/components/school/academics/EvaluationsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryClassEvaluationsPage } from '$lib/queries/assessments.queries';

	const selectedId = $derived($page.params.id);
	const classId = $derived($page.params.classId ?? '6a');
	const query = $derived(queryClassEvaluationsPage(classId));
</script>

<PageQuery {query} loadingTitle={$t('tab.evaluations')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.evaluations')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<EvaluationsView
				classId={data.classId}
				onSelect={ev => appGoto(detailHref.classEvaluation(data.classId, ev.id))}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
