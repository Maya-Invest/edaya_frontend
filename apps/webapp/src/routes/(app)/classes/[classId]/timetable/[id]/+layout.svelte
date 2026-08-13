<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import {
		MODAL_QUERY_KEY,
		MODAL_STEP_QUERY_KEY,
		MODAL_TAB_QUERY_KEY,
		MODAL_TARGET_QUERY_KEY,
	} from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
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
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		next.searchParams.delete(MODAL_STEP_QUERY_KEY);
		next.searchParams.delete(MODAL_TAB_QUERY_KEY);
		const href = `${appPath('/(app)/classes/[classId]/timetable', { classId })}${next.search}` as ResolvedPathname;
		appGoto(href);
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
