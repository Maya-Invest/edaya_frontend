<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { TASK_QUERY_KEYS } from '$lib/modal/modal-url';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getTimetablePageState } from '../timetable-page.svelte';
	import SessionAttendanceTask from './(tabs)/attendance/components/SessionAttendanceTask.svelte';
	import SessionDrawer from './components/SessionDrawer.svelte';
	import {
		clearSessionDetailTabStates,
		createAndRegisterSessionDetailStates,
	} from './session-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const timetablePage = getTimetablePageState();
	const detailTabs = createAndRegisterSessionDetailStates(() => timetablePage);
	const tasks = createUrlSyncedModals({ getUrl: () => $page.url, owned: ['attendance-roll-call'], allowed: ['attendance-roll-call'], queryKeys: TASK_QUERY_KEYS, allowedTabs: ['session'] });
	const rollCallOpen = bindUrlModal(tasks, 'attendance-roll-call');
	$effect(() => {
		tasks.hydrate();
	});
	const classId = $derived($page.params.classId ?? '');
	const session = $derived(timetablePage.selected);

	function closeDetail() {
		clearSessionDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/classes/[classId]/timetable', { classId }), $page.url));
	}

	$effect(() => {
		const sessionId = $page.params.id;
		if (!sessionId) {
			clearSessionDetailTabStates(detailTabs);
			return;
		}
		const sliceReady = timetablePage.slice?.classId === classId;
		if (sliceReady && !timetablePage.selectedSession(classId, sessionId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	{#if rollCallOpen.open && session}
		{#key `${detailTabs.attendance.scope}|${session.id}`}
			<SessionAttendanceTask {session} bind:open={rollCallOpen.open} />
		{/key}
	{:else}
		<SessionDrawer
			{session}
			loading={!session}
			onClose={closeDetail}
		>
			{@render children()}
		</SessionDrawer>
	{/if}
{/if}
