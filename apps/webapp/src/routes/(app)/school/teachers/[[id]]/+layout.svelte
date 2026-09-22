<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getTeachersPageState } from '../teachers-page.svelte';
	import TeacherDrawer from './components/TeacherDrawer.svelte';
	import {
		clearTeacherDetailTabStates,
		createAndRegisterTeacherDetailStates,
	} from './teacher-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const teachersPage = getTeachersPageState();
	const detailTabs = createAndRegisterTeacherDetailStates(() => teachersPage);
	const teacher = $derived(teachersPage.selected);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearTeacherDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/teachers/[[id]]'), $page.url));
	}

	$effect(() => {
		const teacherId = $page.params.id;
		if (!shouldResolveSelection(teacherId)) {
			if (!teacherId) {
				clearTeacherDetailTabStates(detailTabs);
			}
			return;
		}

		const version = ++selectionRequestVersion;
		teachersPage.selectedResolving = true;

		void teachersPage.ensureDrawerSelection(teacherId)
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
					teachersPage.selectedResolving = false;
				}
			});
	});
</script>

{#if $page.params.id}
	<TeacherDrawer
		{teacher}
		loading={drawerEntityLoading(teacher?.id, $page.params.id)}
		onClose={closeDetail}
	>
		{@render children?.()}
	</TeacherDrawer>
{/if}
