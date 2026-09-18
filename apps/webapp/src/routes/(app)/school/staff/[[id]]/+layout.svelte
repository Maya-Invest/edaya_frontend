<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getStaffPageState } from '../staff-page.svelte';
	import StaffDrawer from './components/StaffDrawer.svelte';
	import {
		clearStaffDetailTabStates,
		createAndRegisterStaffDetailStates,
	} from './staff-detail-states.svelte';

	const { children }: { children: Snippet } = $props();

	const staffPage = getStaffPageState();
	const detailTabs = createAndRegisterStaffDetailStates(() => staffPage);
	const staff = $derived(staffPage.selected);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		clearStaffDetailTabStates(detailTabs);
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/staff/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		const staffId = $page.params.id;
		if (!shouldResolveSelection(staffId)) {
			if (!staffId) {
				clearStaffDetailTabStates(detailTabs);
			}
			return;
		}

		const version = ++selectionRequestVersion;
		staffPage.selectedResolving = true;

		void staffPage.ensureDrawerSelection(staffId)
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
					staffPage.selectedResolving = false;
				}
			});
	});
</script>

{#if $page.params.id}
	<StaffDrawer
		{staff}
		loading={drawerEntityLoading(staff?.id, $page.params.id)}
		onClose={closeDetail}
	>
		{@render children()}
	</StaffDrawer>
{/if}
