<script lang="ts">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { EvaluationsPageSlice } from '../evaluations-page.svelte';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import { evaluationsPeriodIdFromUrl } from '../lib/evaluation-helpers';
	import { getEvaluationsPageState } from '../evaluations-page.svelte';

	const {
		data,
	}: {
		data: Partial<EvaluationsPageSlice> & PageLoadMeta;
	} = $props();

	const evaluationsPage = getEvaluationsPageState();

	$effect(() => {
		const classId = data.classId;
		const periodId = data.periodId ?? '';
		if (!classId || !periodId) {
			return;
		}
		const urlPeriod = evaluationsPeriodIdFromUrl($page.url);
		if (urlPeriod && periodId !== urlPeriod) {
			return;
		}
		void data.evaluations;
		void data.subjects;
		untrack(() => {
			const current = evaluationsPage.slice;
			if (current?.classId === classId && current.periodId === periodId) {
				return;
			}
			evaluationsPage.applySlice(classId, data);
		});
	});
</script>
