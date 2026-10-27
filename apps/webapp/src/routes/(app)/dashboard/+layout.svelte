<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import DashboardSummaryHeader from './components/DashboardSummaryHeader.svelte';
	import DirectorDashboardView from './components/DirectorDashboardView.svelte';
	import {
		DashboardPageState,
		setDashboardPageState,
	} from './dashboard-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const dashboardPage = new DashboardPageState();
	setDashboardPageState(dashboardPage);
	registerVersionInvalidation(dashboardPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = dashboardPage.queryListPage();
</script>

<main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<section class="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-6">
		<DashboardSummaryHeader generatedAt={dashboardPage.overview?.generatedAt} noPeriod={dashboardPage.overview?.academicPeriodId === null} />
		<PageQuery {query} cache={false} loadingTitle={$t('dashboard.title')}>
			{#snippet children(data)}
				<DataState
					status={data.status}
					errorMessage={data.errorMessage}
					emptyTitle={$t('dashboard.noYearTitle')}
					emptyDescription={$t('dashboard.noYearDescription')}
				>
					{#if dashboardPage.overview}
						<DirectorDashboardView overview={dashboardPage.overview} />
					{/if}
					{@render pageChildren()}
				</DataState>
			{/snippet}
		</PageQuery>
	</section>
</main>
