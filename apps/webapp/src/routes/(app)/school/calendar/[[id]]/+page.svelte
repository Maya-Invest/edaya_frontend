<script lang="ts">
	import type { SchoolYearEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import SchoolCalendarView from '$lib/components/school/scheduling/SchoolCalendarView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { querySchoolCalendarPage } from '$lib/queries/school-life.queries';

	const query = querySchoolCalendarPage();
	const selectedId = $derived($page.params.id);

	function selectEvent(ev: SchoolYearEvent) {
		const path = detailHref.schoolCalendarEvent(ev.id);
		appGoto(`${path}${$page.url.search}`);
	}
</script>

<PageQuery {query} loadingTitle={$t('school.calendar')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.calendar')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<SchoolCalendarView
				{selectedId}
				onSelect={selectEvent}
			/>
		</DataState>
	{/snippet}
</PageQuery>
