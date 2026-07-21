<script lang="ts">
	import { getReportCardsPageState } from '../report-cards-page.svelte';
	import ReportCardResultDetail from './components/ReportCardResultDetail.svelte';

	const reportCardsPage = getReportCardsPageState();
	const result = $derived(reportCardsPage.selected);
</script>

{#if result}
	<ReportCardResultDetail {result} />
{/if}
