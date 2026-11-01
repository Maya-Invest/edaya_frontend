<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getActivitiesPageState } from '../activities-page.svelte';
	import {
		clearActivityDetailTabStates,
		createAndRegisterActivityDetailStates,
	} from './activity-detail-states.svelte';
	import ActivityDrawer from './components/ActivityDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const activitiesPage = getActivitiesPageState();
	const detailTabs = createAndRegisterActivityDetailStates(() => activitiesPage);
	const activity = $derived(activitiesPage.selected);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearActivityDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/activities/[[id]]'), $page.url));
	}

	$effect(() => {
		const activityId = $page.params.id;
		if (!shouldResolveSelection(activityId)) {
			if (!activityId) {
				clearActivityDetailTabStates(detailTabs);
			}
			return;
		}

		const version = ++selectionRequestVersion;
		activitiesPage.selectedResolving = true;

		void activitiesPage.ensureDrawerSelection(activityId)
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
					activitiesPage.selectedResolving = false;
				}
			});
	});
</script>

{#if $page.params.id}
	<ActivityDrawer
		{activity}
		loading={drawerEntityLoading(activity?.id, $page.params.id)}
		onClose={closeDetail}
	>
		{@render children()}
	</ActivityDrawer>
{/if}
