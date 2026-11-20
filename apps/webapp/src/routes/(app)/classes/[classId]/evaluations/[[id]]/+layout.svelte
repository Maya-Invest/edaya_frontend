<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { TASK_QUERY_KEYS } from '$lib/modal/modal-url';
	import { appPath } from '$lib/navigation/app-navigation';
	import { replaceRouteSurface, closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getEvaluationsPageState } from '../evaluations-page.svelte';
	import { gradingTaskHref } from '../lib/grading-task';
	import EvaluationDrawer from './components/EvaluationDrawer.svelte';
	import EvaluationGradingTask from './components/EvaluationGradingTask.svelte';
	import {
		clearEvaluationDetailTabStates,
		createAndRegisterEvaluationDetailStates,
	} from './evaluation-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const evaluationsPage = getEvaluationsPageState();
	const detailTabs = createAndRegisterEvaluationDetailStates();
	evaluationsPage.attachGrading(detailTabs.grading);
	const classId = $derived($page.params.classId ?? '');
	const tasks = createUrlSyncedModals({ getUrl: () => $page.url, owned: ['grade-entry'], allowed: ['grade-entry'], queryKeys: TASK_QUERY_KEYS, allowedTabs: ['entry', 'correction'] });
	const taskOpen = bindUrlModal(tasks, 'grade-entry');
	$effect(() => {
		if ($page.url.searchParams.get('modal') === 'request-correction' && $page.params.id) {
			replaceRouteSurface(gradingTaskHref($page.url, classId, $page.params.id, 'correction'));
		}
		else {
			tasks.hydrate();
		}
	});
	const evaluation = $derived(evaluationsPage.selected);

	$effect(() => {
		evaluationsPage.attachGrading(detailTabs.grading);
		return () => evaluationsPage.detachGrading(detailTabs.grading);
	});

	function closeDetail() {
		clearEvaluationDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/classes/[classId]/evaluations/[[id]]', { classId }), $page.url));
	}

	$effect(() => {
		const evaluationId = $page.params.id;
		if (!evaluationId) {
			clearEvaluationDetailTabStates(detailTabs);
			return;
		}
		const sliceReady = evaluationsPage.slice?.classId === classId;
		if (sliceReady && !evaluationsPage.selectedEvaluation(classId, evaluationId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	{#if taskOpen.open && evaluation}
		{#key `${evaluationsPage.scope}|${evaluation.id}|${tasks.tab}`}
			<EvaluationGradingTask {evaluation} panel={tasks.tab} bind:open={taskOpen.open} />
		{/key}
	{:else}
		<EvaluationDrawer
			{classId}
			{evaluation}
			loading={!evaluation}
			onClose={closeDetail}
			onDeleted={closeDetail}
		>
			{@render children()}
		</EvaluationDrawer>
	{/if}
{/if}
