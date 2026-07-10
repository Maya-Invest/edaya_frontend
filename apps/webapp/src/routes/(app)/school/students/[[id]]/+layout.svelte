<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getStudentsPageState } from '../students-page.svelte';
	import StudentDrawer from './components/StudentDrawer.svelte';
	import {
		clearStudentDetailTabStates,
		createAndRegisterStudentDetailStates,
	} from './student-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const studentsPage = getStudentsPageState();
	const detailTabs = createAndRegisterStudentDetailStates(() => studentsPage);

	const student = $derived(studentsPage.selected);
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearStudentDetailTabStates(detailTabs);
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/students/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		const studentId = $page.params.id;
		if (!studentId) {
			clearStudentDetailTabStates(detailTabs);
			return;
		}

		const version = ++selectionRequestVersion;
		studentsPage.selectedResolving = true;

		void studentsPage.ensureDrawerSelection(studentId)
			.then((ok) => {
				if (version !== selectionRequestVersion) {
					return;
				}
				if (!ok) {
					closeDetail();
				}
			})
			.catch(() => {
				if (version !== selectionRequestVersion) {
					return;
				}
				closeDetail();
			})
			.finally(() => {
				if (version === selectionRequestVersion) {
					studentsPage.selectedResolving = false;
				}
			});
	});
</script>

{#if $page.params.id}
	<StudentDrawer
		student={student}
		loading={studentsPage.selectedResolving || !student}
		onClose={closeDetail}
	>
		{@render children()}
	</StudentDrawer>
{/if}
