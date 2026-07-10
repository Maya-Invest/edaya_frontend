<script lang="ts">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { EvaluationsPageSlice } from '../evaluations-page.svelte';
	import { untrack } from 'svelte';
	import { getEvaluationsPageState } from '../evaluations-page.svelte';

	const {
		data,
	}: {
		data: Partial<EvaluationsPageSlice> & PageLoadMeta;
	} = $props();

	const evaluationsPage = getEvaluationsPageState();

	$effect(() => {
		const classId = data.classId;
		if (!classId) {
			return;
		}
		untrack(() => {
			evaluationsPage.seed(classId, data);
		});
	});
</script>
