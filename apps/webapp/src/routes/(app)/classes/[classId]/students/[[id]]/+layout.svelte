<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { untrack } from 'svelte';
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
	const scope = $derived(JSON.stringify([authSession.authUserId, authSession.schoolId, academicContext.scopeGeneration, authSession.grants]));
	let resolvedScope = $state(untrack(() => scope));
	let requestedScope = untrack(() => scope);
	const student = $derived(resolvedScope === scope ? classStudentsPage.selected : undefined);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearStudentDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/classes/[classId]/students/[[id]]', { classId }), $page.url));
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
		classStudentsPage.selectedResolving = true;

		void untrack(() => changedScope ? classStudentsPage.ensureSelectedStudent(studentId, true) : classStudentsPage.ensureDrawerSelection(studentId))
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
