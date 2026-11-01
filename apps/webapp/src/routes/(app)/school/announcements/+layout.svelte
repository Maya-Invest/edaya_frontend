<script lang="ts">
	import type { Announcement } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { readAnnouncementListFilters } from '$lib/list/list-url-filters';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		AnnouncementsPageState,
		setAnnouncementsPageState,
	} from './announcements-page.svelte';
	import AnnouncementsList from './components/AnnouncementsList.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const announcementsPage = new AnnouncementsPageState(() => $page.url);
	setAnnouncementsPageState(announcementsPage);
	registerVersionInvalidation(announcementsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = announcementsPage.queryListPage();
	const urlFilters = $derived(readAnnouncementListFilters($page.url));

	$effect(() => {
		announcementsPage.filters.hydrate(urlFilters);
	});

	function selectAnnouncement(announcement: Announcement) {
		const path = detailHref.schoolAnnouncement(announcement.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} loadingTitle={$t('school.announcements')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.announcements')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<AnnouncementsList onSelect={selectAnnouncement} selectedId={announcementsPage.selectedId} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
