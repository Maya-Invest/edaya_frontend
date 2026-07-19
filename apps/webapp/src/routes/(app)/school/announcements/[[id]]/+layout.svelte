<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getAnnouncementsPageState } from '../announcements-page.svelte';
	import AnnouncementDrawer from './components/AnnouncementDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const announcementsPage = getAnnouncementsPageState();
	const announcement = $derived(announcementsPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/announcements/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
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
