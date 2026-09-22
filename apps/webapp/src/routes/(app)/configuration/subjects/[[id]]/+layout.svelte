<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getSubjectsPageState } from '../subjects-page.svelte';
	import SubjectDrawer from './components/SubjectDrawer.svelte';
	import {
		clearSubjectDetailTabStates,
		createAndRegisterSubjectDetailStates,
	} from './subject-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const subjectsPage = getSubjectsPageState();
	const detailTabs = createAndRegisterSubjectDetailStates();
	const subject = $derived(subjectsPage.selected);

	function closeDetail() {
		clearSubjectDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/configuration/subjects/[[id]]'), $page.url));
	}

	$effect(() => {
		const subjectId = $page.params.id;
		if (!subjectId) {
			clearSubjectDetailTabStates(detailTabs);
			return;
		}
		if (subjectsPage.slice && !subjectsPage.subjectById(subjectId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<SubjectDrawer
		{subject}
		loading={!subject}
		onClose={closeDetail}
		onDeleted={closeDetail}
	>
		{@render children()}
	</SubjectDrawer>
{/if}
