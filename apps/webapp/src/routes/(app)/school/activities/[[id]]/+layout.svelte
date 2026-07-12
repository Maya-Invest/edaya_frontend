<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getActivitiesPageState } from '../activities-page.svelte';
	import ActivityDrawer from './components/ActivityDrawer.svelte';
	import {
		clearActivityDetailTabStates,
		createAndRegisterActivityDetailStates,
	} from './activity-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const activitiesPage = getActivitiesPageState();
	const detailTabs = createAndRegisterActivityDetailStates(() => activitiesPage);
	const activity = $derived(activitiesPage.selected);
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearActivityDetailTabStates(detailTabs);
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/activities/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		const activityId = $page.params.id;
		if (!activityId) {
			clearActivityDetailTabStates(detailTabs);
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
		loading={activitiesPage.selectedResolving || !activity}
		onClose={closeDetail}
	>
		{@render children()}
	</ActivityDrawer>
{/if}
