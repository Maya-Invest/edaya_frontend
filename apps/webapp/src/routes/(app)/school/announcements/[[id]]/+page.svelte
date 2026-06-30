<script lang="ts">
	import type { Announcement } from '$lib/types/school';
	import { page } from '$app/stores';
	import AnnouncementsView from '$lib/components/school/school-life/AnnouncementsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { querySchoolAnnouncementsPage } from '$lib/queries/school-life.queries';

	const selectedId = $derived($page.params.id);
	const query = querySchoolAnnouncementsPage();

	function selectAnnouncement(announcement: Announcement) {
		const path = detailHref.schoolAnnouncement(announcement.id);
		appGoto(`${path}${$page.url.search}`);
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
			<AnnouncementsView onSelect={selectAnnouncement} {selectedId} />
		</DataState>
	{/snippet}
</PageQuery>
