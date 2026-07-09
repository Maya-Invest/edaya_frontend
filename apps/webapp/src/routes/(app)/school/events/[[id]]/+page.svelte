<script lang="ts">
	import { page } from '$app/stores';
	import SchoolEventsView from '$lib/components/school/school-life/SchoolEventsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { querySchoolEventsPage } from '$lib/queries/school-life.queries';

	const selectedId = $derived($page.params.id);
	const query = querySchoolEventsPage();
</script>

<PageQuery {query} loadingTitle={$t('school.events')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.events')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<SchoolEventsView
				onSelect={i => appGoto(detailHref.schoolIncident(i.id))}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
