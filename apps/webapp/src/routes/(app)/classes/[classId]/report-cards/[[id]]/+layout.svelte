<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getReportCardsPageState } from '../report-cards-page.svelte';
	import ReportCardDrawer from './components/ReportCardDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const reportCardsPage = getReportCardsPageState();
	const classId = $derived($page.params.classId ?? '6a');
	const result = $derived(reportCardsPage.selected);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/classes/[classId]/report-cards/[[id]]', { classId }), $page.url));
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
