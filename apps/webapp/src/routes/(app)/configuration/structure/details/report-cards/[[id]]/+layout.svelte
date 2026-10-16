<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getReportCardsPageState } from '../report-cards-page.svelte';
	import ReportCardDefinitionDrawer from './components/ReportCardDefinitionDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const reportCardsPage = getReportCardsPageState();
	const definition = $derived(reportCardsPage.selected);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/configuration/structure/details'), $page.url));
	}

	$effect(() => {
		const definitionId = $page.params.id;
		if (!definitionId) {
			return;
		}
		if (reportCardsPage.slice && !reportCardsPage.selectedDefinition(definitionId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<ReportCardDefinitionDrawer
		{definition}
		loading={!definition}
		onClose={closeDetail}
	>
		{@render children()}
	</ReportCardDefinitionDrawer>
{/if}
