<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getReportCardsPageState } from '../report-cards-page.svelte';
	import ReportCardDrawer from './components/ReportCardDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const reportCardsPage = getReportCardsPageState();
	const classId = $derived($page.params.classId ?? '6a');
	const result = $derived(reportCardsPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/classes/[classId]/report-cards/[[id]]', { classId })}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		const resultId = $page.params.id;
		if (!resultId) {
			return;
		}
		const sliceReady = reportCardsPage.slice?.classId === classId;
		if (sliceReady && !reportCardsPage.selectedResult(classId, resultId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<ReportCardDrawer
		{result}
		loading={!result}
		onClose={closeDetail}
	>
		{@render children()}
	</ReportCardDrawer>
{/if}
