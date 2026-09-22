<script lang="ts">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { AttendancePageSlice } from '../attendance-page.svelte';
	import { untrack } from 'svelte';
	import { getAttendancePageState } from '../attendance-page.svelte';

	const {
		data,
	}: {
		data: Partial<AttendancePageSlice> & PageLoadMeta;
	} = $props();

	const attendancePage = getAttendancePageState();

	$effect(() => {
		const classId = data.classId;
		if (!classId) {
			return;
		}
		untrack(() => {
			attendancePage.applySlice(classId, data);
		});
	});
</script>
