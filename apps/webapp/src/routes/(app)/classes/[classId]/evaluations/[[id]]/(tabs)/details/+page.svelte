<script lang="ts">
	import { page } from '$app/stores';
	import { getEvaluationsPageState } from '../../../evaluations-page.svelte';
	import EvaluationDetailsTab from './components/EvaluationDetailsTab.svelte';

	const evaluationsPage = getEvaluationsPageState();
	const classId = $derived($page.params.classId ?? '');
	const evaluation = $derived(evaluationsPage.selected);
</script>

{#if evaluation}
	<EvaluationDetailsTab {evaluation} />
{/if}
