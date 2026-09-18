<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
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
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/configuration/classes/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
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
