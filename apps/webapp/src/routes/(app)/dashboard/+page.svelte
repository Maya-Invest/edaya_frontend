<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import DirectorDashboardView from '$lib/components/school/dashboard/DirectorDashboardView.svelte';
	import HomeroomAttendanceNudge from '$lib/components/school/dashboard/HomeroomAttendanceNudge.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { queryDashboardPage } from '$lib/queries/dashboard.queries';

	const query = queryDashboardPage();
</script>

{#key `${academicContext.yearId}:${academicContext.periodId}`}
	<PageQuery {query} loadingTitle={$t('dashboard.title')}>
		{#snippet children(data)}
			<DataState
				status={data.status}
				errorMessage={data.errorMessage}
				emptyTitle={$t('dashboard.title')}
				emptyDescription={$t('dataState.emptyDescription')}
			>
				<HomeroomAttendanceNudge />
				{#if data.overview}
					<DirectorDashboardView overview={data.overview} />
				{/if}
			</DataState>
		{/snippet}
	</PageQuery>
{/key}
