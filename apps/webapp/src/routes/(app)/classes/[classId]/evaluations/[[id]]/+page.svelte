<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getEvaluationsPageState } from '../evaluations-page.svelte';
	import EvaluationDetail from './components/EvaluationDetail.svelte';

	const evaluationsPage = getEvaluationsPageState();
	const classId = $derived($page.params.classId ?? '6a');
	const evaluation = $derived(evaluationsPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/classes/[classId]/evaluations/[[id]]', { classId })}${next.search}` as ResolvedPathname;
		appGoto(href);
	}
</script>

{#if evaluation}
	<EvaluationDetail {classId} {evaluation} onDeleted={closeDetail} />
{/if}
