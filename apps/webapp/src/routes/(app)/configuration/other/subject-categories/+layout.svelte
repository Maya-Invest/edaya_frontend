<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readSubjectCategoryListFilters } from '$lib/list/list-url-filters';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import SubjectCategoriesList from './components/SubjectCategoriesList.svelte';
	import {
		setSubjectCategoriesPageState,
		SubjectCategoriesPageState,
	} from './subject-categories-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const subjectCategoriesPage = new SubjectCategoriesPageState(() => $page.url);
	setSubjectCategoriesPageState(subjectCategoriesPage);
	registerVersionInvalidation(subjectCategoriesPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = subjectCategoriesPage.queryListPage();
	const urlFilters = $derived(readSubjectCategoryListFilters($page.url));

	$effect(() => {
		subjectCategoriesPage.filters.hydrate(urlFilters);
	});
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('config.subjectCategories')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('subjectCategories.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<SubjectCategoriesList />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
