<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
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
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/classes/[classId]/attendance/[[id]]', { classId })}${next.search}` as ResolvedPathname;
		appGoto(href);
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
