<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { untrack } from 'svelte';
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
	const selectedId = $derived($page.params.id);

	function closeDetail() {
		clearActivityDetailTabStates(detailTabs);
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/activities/[[id]]'), $page.url));
	}

	$effect(() => {
		const id = selectedId;
		const ready = academicContext.shellReady;
		const denied = activitiesPage.list.denied;
		void activitiesPage.scope;
		void activitiesPage.detailRevision;
		untrack(() => {
			clearActivityDetailTabStates(detailTabs);
			activitiesPage.clearDetail();
		});
		if (!id || !ready)
			return;
		if (denied) {
			closeDetail();
			return;
		}
		const controller = new AbortController();
		untrack(() => void activitiesPage.ensureDrawerSelection(id, controller.signal)
			.then((found) => {
				if (!found && !controller.signal.aborted)
					closeDetail();
			})
			.catch(() => {
				if (!controller.signal.aborted)
					closeDetail();
			}));
		return () => controller.abort();
	});
</script>

{#if $page.params.id}
	<ActivityDrawer
		{activity}
		loading={activity?.id !== $page.params.id}
		onClose={closeDetail}
	>
		{@render children()}
	</ActivityDrawer>
{/if}
