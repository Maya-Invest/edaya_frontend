<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import {
		clearStudentDetailTabStates,
		createAndRegisterStudentDetailStates,
	} from '../../../../school/students/[[id]]/student-detail-states.svelte';
	import { getClassStudentsPageState } from '../class-students-page.svelte';
	import StudentDrawer from './components/StudentDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const classStudentsPage = getClassStudentsPageState();
	const detailTabs = createAndRegisterStudentDetailStates(() => classStudentsPage);

	const classId = $derived($page.params.classId ?? '6a');
	const student = $derived(classStudentsPage.selected);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearStudentDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/classes/[classId]/students/[[id]]', { classId }), $page.url));
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
		classStudentsPage.selectedResolving = true;

		void classStudentsPage.ensureDrawerSelection(studentId)
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
					classStudentsPage.selectedResolving = false;
				}
			});
	});
</script>

{#if $page.params.id}
	<StudentDrawer
		{student}
		loading={drawerEntityLoading(student?.id, $page.params.id)}
		onClose={closeDetail}
	>
		{@render children()}
	</StudentDrawer>
{/if}
