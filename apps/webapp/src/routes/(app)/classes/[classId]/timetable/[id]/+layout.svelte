<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getTimetablePageState } from '../timetable-page.svelte';
	import SessionDrawer from './components/SessionDrawer.svelte';
	import {
		clearSessionDetailTabStates,
		createAndRegisterSessionDetailStates,
	} from './session-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const timetablePage = getTimetablePageState();
	const detailTabs = createAndRegisterSessionDetailStates(() => timetablePage);
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
	<SessionDrawer
		{session}
		loading={!session}
		onClose={closeDetail}
	>
		{@render children()}
	</SessionDrawer>
{/if}
