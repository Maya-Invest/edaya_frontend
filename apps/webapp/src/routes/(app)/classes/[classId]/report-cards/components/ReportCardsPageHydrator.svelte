<script lang="ts">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { ReportCardsPageSlice } from '../report-cards-page.svelte';
	import { untrack } from 'svelte';
	import { getReportCardsPageState } from '../report-cards-page.svelte';

	const {
		data,
	}: {
		data: Partial<ReportCardsPageSlice> & PageLoadMeta;
	} = $props();

	const reportCardsPage = getReportCardsPageState();

	$effect(() => {
		const classId = data.classId;
		if (!classId) {
			return;
		}
		untrack(() => {
			reportCardsPage.applySlice(classId, data);
		});
	});
</script>
