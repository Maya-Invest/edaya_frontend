<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { readStaffListFilters } from '$lib/list/list-url-filters';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import StaffList from './components/StaffList.svelte';
	import { staffListUsesFullRoster } from './lib/staff-list-filters';
	import {
		StaffPageState,
		setStaffPageState,
	} from './staff-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const staffPage = new StaffPageState(() => $page.url);
	setStaffPageState(staffPage);
	registerVersionInvalidation(staffPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = staffPage.queryListPage();
	const urlFilters = $derived(readStaffListFilters($page.url));

	let wasFullRoster = false;

	$effect(() => {
		staffPage.filters.hydrate(urlFilters);
	});

	$effect(() => {
		if (!staffPage.filters.ready) {
			return;
		}
		void staffPage.filters.values.q;
		void staffPage.filters.values.sort;

		if (!staffListUsesFullRoster(staffPage.filters.values)) {
			staffPage.clearFullRoster();
			if (wasFullRoster) {
				void staffPage.refreshList();
			}
			wasFullRoster = false;
			return;
		}

		wasFullRoster = true;
		void staffPage.loadFullRoster();
	});

	function selectStaff(member: StaffMember) {
		const path = detailHref.configStaffMember(member.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} loadingTitle={$t('config.staff')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('config.staff')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<StaffList onSelect={selectStaff} selectedId={staffPage.selectedId} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
