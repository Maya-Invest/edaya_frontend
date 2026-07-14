<script lang="ts">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { TimetablePageSlice } from '../lib';
	import { untrack } from 'svelte';
	import { getTimetablePageState } from '../timetable-page.svelte';

	const {
		data,
	}: {
		data: Partial<TimetablePageSlice> & PageLoadMeta;
	} = $props();

	const timetablePage = getTimetablePageState();

	$effect(() => {
		const classId = data.classId;
		if (!classId) {
			return;
		}
		untrack(() => {
			timetablePage.seed(classId, data);
		});
	});
</script>
