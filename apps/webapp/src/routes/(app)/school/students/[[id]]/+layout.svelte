<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import StudentDrawer from '../components/StudentDrawer.svelte';
	import { ensureStudentDrawerSelection } from '../students.queries';
	import { getStudentsPageState } from '../students-page.svelte';

	const { children }: { children: Snippet } = $props();

	const studentsPage = getStudentsPageState();

	const student = $derived(studentsPage.selected);
	let selectionRequestVersion = 0;

	function closeDetail() {
		studentsPage.clearDetail();
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/students/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		const studentId = $page.params.id;
		if (!studentId) {
			studentsPage.clearDetail();
			return;
		}

		const version = ++selectionRequestVersion;
		studentsPage.selectedResolving = true;

		void ensureStudentDrawerSelection(studentsPage, studentId)
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
