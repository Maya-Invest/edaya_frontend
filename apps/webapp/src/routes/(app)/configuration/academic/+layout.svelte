<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readAcademicAdminListFilters } from '$lib/list/list-url-filters';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		AcademicPageState,
		setAcademicPageState,
	} from './academic-page.svelte';
	import AcademicAdminView from './components/AcademicAdminView.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const academicPage = new AcademicPageState(() => $page.url);
	setAcademicPageState(academicPage);
	registerVersionInvalidation(academicPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = academicPage.queryListPage();
	const urlFilters = $derived(readAcademicAdminListFilters($page.url));
	const statusKeys = ['all', 'draft', 'published'] as const;

	$effect(() => {
		const next = urlFilters;
		academicPage.filters.hydrate({
			q: next.q,
			status: statusKeys.includes(next.status as (typeof statusKeys)[number])
				? next.status
				: 'all',
		});
	});
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('config.academic')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('academic.title')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<AcademicAdminView />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
