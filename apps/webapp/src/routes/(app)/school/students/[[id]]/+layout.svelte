<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
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
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearStudentDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/students/[[id]]'), $page.url));
	}

	$effect(() => {
		const studentId = $page.params.id;
		if (!shouldResolveSelection(studentId)) {
			if (!studentId) {
				clearStudentDetailTabStates(detailTabs);
			}
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
		loading={drawerEntityLoading(student?.id, $page.params.id)}
		onClose={closeDetail}
	>
		{@render children()}
	</StudentDrawer>
{/if}
