<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import type { StudentsPageState } from '../../../../school/students/students-page.svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import {
		clearStudentDetailTabStates,
		createAndRegisterStudentDetailStates,
	} from '../../../../school/students/[[id]]/student-detail-states.svelte';
	import { getClassStudentsPageState } from '../class-students-page.svelte';
	import StudentDrawer from './components/StudentDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const classStudentsPage = getClassStudentsPageState();
	const detailTabs = createAndRegisterStudentDetailStates(
		() => classStudentsPage as unknown as StudentsPageState,
	);

	const classId = $derived($page.params.classId ?? '6a');
	const student = $derived(classStudentsPage.selected);
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearStudentDetailTabStates(detailTabs);
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/classes/[classId]/students/[[id]]', { classId })}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		const studentId = $page.params.id;
		if (!studentId) {
			clearStudentDetailTabStates(detailTabs);
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
		loading={classStudentsPage.selectedResolving || !student}
		onClose={closeDetail}
	>
		{@render children()}
	</StudentDrawer>
{/if}
