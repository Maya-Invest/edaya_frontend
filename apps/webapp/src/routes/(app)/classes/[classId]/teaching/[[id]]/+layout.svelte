<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getTeachingPageState } from '../teaching-page.svelte';
	import SubjectDrawer from './components/SubjectDrawer.svelte';
	import {
		clearSubjectDetailTabStates,
		createAndRegisterSubjectDetailStates,
	} from './subject-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const teachingPage = getTeachingPageState();
	const detailTabs = createAndRegisterSubjectDetailStates();
	const classId = $derived($page.params.classId ?? '6a');
	const subject = $derived(teachingPage.selected);

	function closeDetail() {
		clearSubjectDetailTabStates(detailTabs);
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/classes/[classId]/teaching/[[id]]', { classId })}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		const subjectId = $page.params.id;
		if (!subjectId) {
			clearSubjectDetailTabStates(detailTabs);
			return;
		}
		const sliceReady = teachingPage.slice?.classId === classId;
		if (sliceReady && !teachingPage.selectedSubject(classId, subjectId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<SubjectDrawer
		{classId}
		{subject}
		loading={!subject}
		onClose={closeDetail}
		onDeleted={closeDetail}
	>
		{@render children()}
	</SubjectDrawer>
{/if}
