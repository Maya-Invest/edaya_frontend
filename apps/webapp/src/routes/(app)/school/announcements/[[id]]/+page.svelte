<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getAnnouncementsPageState } from '../announcements-page.svelte';
	import AnnouncementDetail from './components/AnnouncementDetail.svelte';

	const announcementsPage = getAnnouncementsPageState();
	const announcement = $derived(announcementsPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/announcements/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}
</script>

{#if announcement}
	<AnnouncementDetail {announcement} onDeleted={closeDetail} />
{/if}
