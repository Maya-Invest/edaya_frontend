<script lang="ts">
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getAnnouncementsPageState } from '../announcements-page.svelte';
	import AnnouncementDetail from './components/AnnouncementDetail.svelte';

	const announcementsPage = getAnnouncementsPageState();
	const announcement = $derived(announcementsPage.selected);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/announcements/[[id]]'), $page.url));
	}
</script>

{#if announcement}
	<AnnouncementDetail {announcement} onDeleted={closeDetail} />
{/if}
