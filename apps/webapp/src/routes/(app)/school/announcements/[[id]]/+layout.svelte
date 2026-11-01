<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getAnnouncementsPageState } from '../announcements-page.svelte';
	import AnnouncementDrawer from './components/AnnouncementDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const announcementsPage = getAnnouncementsPageState();
	const announcement = $derived(announcementsPage.selected);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/announcements/[[id]]'), $page.url));
	}

	$effect(() => {
		const announcementId = $page.params.id;
		if (!announcementId) {
			return;
		}
		if (!announcementsPage.findAnnouncement(announcementId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<AnnouncementDrawer
		{announcement}
		loading={!announcement}
		onClose={closeDetail}
	>
		{@render children()}
	</AnnouncementDrawer>
{/if}
