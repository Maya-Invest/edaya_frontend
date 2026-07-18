<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getReportCardsPageState } from '../report-cards-page.svelte';
	import ReportCardDefinitionDrawer from './components/ReportCardDefinitionDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const reportCardsPage = getReportCardsPageState();
	const definition = $derived(reportCardsPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/configuration/report-cards/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
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
