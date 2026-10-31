<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { untrack } from 'svelte';
	import { getStudentsPageState } from '../students-page.svelte';
	import StudentDrawer from './components/StudentDrawer.svelte';
	import {
		clearStudentDetailTabStates,
		createAndRegisterStudentDetailStates,
	} from './student-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const studentsPage = getStudentsPageState();
	const detailTabs = createAndRegisterStudentDetailStates(() => studentsPage);

	const scope = $derived(JSON.stringify([authSession.authUserId, authSession.schoolId, academicContext.scopeGeneration, authSession.grants]));
	let resolvedScope = $state(untrack(() => scope));
	let requestedScope = untrack(() => scope);
	const student = $derived(resolvedScope === scope ? studentsPage.selected : undefined);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearStudentDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/students/[[id]]'), $page.url));
	}

	$effect(() => {
		if (!academicContext.shellReady)
			return;
		const studentId = $page.params.id;
		const nextScope = scope;
		const changedScope = requestedScope !== nextScope;
		if (!shouldResolveSelection(studentId) && !changedScope) {
			if (!studentId) {
				clearStudentDetailTabStates(detailTabs);
			}
			return;
		}

		if (!studentId)
			return;
		requestedScope = nextScope;
		if (changedScope) {
			resolvedScope = '';
			clearStudentDetailTabStates(detailTabs);
		}
		const version = ++selectionRequestVersion;
		studentsPage.selectedResolving = true;

		void untrack(() => changedScope ? studentsPage.ensureSelectedStudent(studentId, true) : studentsPage.ensureDrawerSelection(studentId))
			.then((ok) => {
				if (version !== selectionRequestVersion) {
					return;
				}
				if (!ok) {
					closeDetail();
				}
				else {
					resolvedScope = nextScope;
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
