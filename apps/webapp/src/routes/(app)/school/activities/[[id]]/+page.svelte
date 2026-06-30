<script lang="ts">
	import type { Activity } from '$lib/types/school';
	import { page } from '$app/stores';
	import ActivitiesView from '$lib/components/school/school-life/ActivitiesView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { querySchoolActivitiesPage } from '$lib/queries/school-life.queries';

	const selectedId = $derived($page.params.id);
	const query = querySchoolActivitiesPage();

	function selectActivity(activity: Activity) {
		const path = detailHref.schoolActivity(activity.id);
		appGoto(`${path}${$page.url.search}`);
	}
</script>

<PageQuery {query} loadingTitle={$t('school.activities')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.activities')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ActivitiesView onSelect={selectActivity} {selectedId} />
		</DataState>
	{/snippet}
</PageQuery>
