<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getEvaluationsPageState } from '../evaluations-page.svelte';
	import EvaluationDrawer from './components/EvaluationDrawer.svelte';
	import {
		clearEvaluationDetailTabStates,
		createAndRegisterEvaluationDetailStates,
	} from './evaluation-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const evaluationsPage = getEvaluationsPageState();
	const detailTabs = createAndRegisterEvaluationDetailStates();
	evaluationsPage.attachGrading(detailTabs.grading);
	const classId = $derived($page.params.classId ?? '6a');
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
