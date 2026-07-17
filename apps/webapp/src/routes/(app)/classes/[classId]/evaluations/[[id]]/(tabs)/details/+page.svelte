<script lang="ts">
	import { getEvaluationsPageState } from '../../../evaluations-page.svelte';
	import EvaluationDetailsTab from './components/EvaluationDetailsTab.svelte';

	const evaluationsPage = getEvaluationsPageState();
	const evaluation = $derived(evaluationsPage.selected);
</script>

{#if evaluation}
	<EvaluationDetailsTab {evaluation} />
{/if}
