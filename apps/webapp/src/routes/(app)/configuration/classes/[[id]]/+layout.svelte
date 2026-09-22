<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getClassesPageState } from '../classes-page.svelte';
	import {
		clearClassGroupDetailTabStates,
		createAndRegisterClassGroupDetailStates,
	} from './class-group-detail-states.svelte';
	import ClassGroupDrawer from './components/ClassGroupDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const classesPage = getClassesPageState();
	const detailTabs = createAndRegisterClassGroupDetailStates(() => classesPage);
	const classGroup = $derived(classesPage.selected);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearClassGroupDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/configuration/classes/[[id]]'), $page.url));
	}

	$effect(() => {
		const classGroupId = $page.params.id;
		if (!shouldResolveSelection(classGroupId)) {
			if (!classGroupId) {
				clearClassGroupDetailTabStates(detailTabs);
			}
			return;
		}

		const version = ++selectionRequestVersion;
		classesPage.selectedResolving = true;

		void classesPage.ensureDrawerSelection(classGroupId)
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
					classesPage.selectedResolving = false;
				}
			});
	});
</script>

{#if $page.params.id}
	<ClassGroupDrawer
		{classGroup}
		loading={drawerEntityLoading(classGroup?.id, $page.params.id)}
		onClose={closeDetail}
	>
		{@render children()}
	</ClassGroupDrawer>
{/if}
