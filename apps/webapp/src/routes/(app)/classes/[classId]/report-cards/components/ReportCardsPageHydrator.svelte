<script lang="ts">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { ReportCardsPageSlice } from '../lib/report-cards-helpers';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import { reportCardsPeriodIdFromUrl } from '../lib/report-cards-helpers';
	import { getReportCardsPageState } from '../report-cards-page.svelte';

	const {
		data,
	}: {
		data: Partial<ReportCardsPageSlice> & PageLoadMeta;
	} = $props();

	const reportCardsPage = getReportCardsPageState();

	$effect(() => {
		const classId = data.classId;
		const periodId = data.periodId ?? '';
		if (!classId || !periodId) {
			return;
		}
		// While PageQuery keeps a stale shell during period refetch, ignore that payload.
		const urlPeriod = reportCardsPeriodIdFromUrl($page.url);
		if (urlPeriod && periodId !== urlPeriod) {
			return;
		}
		void data.results;
		void data.students;
		untrack(() => {
			const current = reportCardsPage.slice;
			if (current?.classId === classId && current.periodId === periodId) {
				return;
			}
			reportCardsPage.applySlice(classId, data);
		});
	});
</script>
