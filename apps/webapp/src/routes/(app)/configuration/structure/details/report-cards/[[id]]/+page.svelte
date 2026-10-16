<script lang="ts">
	import { getReportCardsPageState } from '../report-cards-page.svelte';
	import ReportCardDefinitionDetail from './components/ReportCardDefinitionDetail.svelte';

	const reportCardsPage = getReportCardsPageState();
	const definition = $derived(reportCardsPage.selected);
</script>

{#if definition}
	<ReportCardDefinitionDetail {definition} />
{/if}
