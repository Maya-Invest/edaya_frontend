<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getAttendancePageState } from '../attendance-page.svelte';
	import {
		AttendanceDayDetailState,
		setAttendanceDayDetailState,
	} from './attendance-day-detail.svelte';
	import AttendanceDayDrawer from './components/AttendanceDayDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const attendancePage = getAttendancePageState();
	const detailState = new AttendanceDayDetailState(() => attendancePage);
	setAttendanceDayDetailState(detailState);

	const classId = $derived($page.params.classId ?? '6a');
	const day = $derived(attendancePage.selected);

	function closeDetail() {
		detailState.clear();
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/classes/[classId]/attendance/[[id]]', { classId }), $page.url));
	}

	$effect(() => {
		const dayId = $page.params.id;
		if (!dayId) {
			detailState.clear();
			return;
		}
		const sliceReady = attendancePage.slice?.classId === classId;
		if (sliceReady && !attendancePage.selectedDay(classId, dayId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<AttendanceDayDrawer
		{day}
		loading={!day}
		onClose={closeDetail}
	>
		{@render children()}
	</AttendanceDayDrawer>
{/if}
