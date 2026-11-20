<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { untrack } from 'svelte';
	import { getReportCardsPageState } from '../report-cards-page.svelte';
	import ReportCardDrawer from './components/ReportCardDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const reportCardsPage = getReportCardsPageState();
	const classId = $derived($page.params.classId ?? '6a');
	const result = $derived(reportCardsPage.selected);

	let failed = $state(false);
	let attempt = $state(0);
	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/classes/[classId]/report-cards/[[id]]', { classId }), $page.url));
	}

	$effect(() => {
		const key = reportCardsPage.detailScope;
		void reportCardsPage.detailRevision;
		void attempt;
		failed = false;
		if (!$page.params.id)
			return;
		const controller = new AbortController();
		untrack(() => void reportCardsPage.loadDetail(controller.signal).then((found) => {
			if (!found && !controller.signal.aborted && key === reportCardsPage.detailScope)
				closeDetail();
		}).catch(() => {
			if (!controller.signal.aborted && key === reportCardsPage.detailScope)
				failed = true;
		}));
		return () => controller.abort();
	});
</script>

{#if $page.params.id}
	<ReportCardDrawer
		{result}
		loading={!result && !failed}
		{failed} onRetry={() => attempt++}
		onClose={closeDetail}
	>
		{@render children()}
	</ReportCardDrawer>
{/if}
