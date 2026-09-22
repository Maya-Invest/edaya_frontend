<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
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
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/classes/[classId]/teaching/[[id]]', { classId }), $page.url));
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
