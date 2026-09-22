<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DirectorDashboardView from '$lib/components/school/dashboard/DirectorDashboardView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
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
	<section class="scrollbar-thin flex-1 overflow-y-auto px-8 py-8">
		<PageQuery {query} loadingTitle={$t('dashboard.title')}>
			{#snippet children(data)}
				<DataState
					preserveShell
					status={data.status}
					errorMessage={data.errorMessage}
					emptyTitle={$t('dashboard.title')}
					emptyDescription={$t('dataState.emptyDescription')}
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
