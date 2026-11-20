<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import SubjectsList from './components/SubjectsList.svelte';
	import {
		setSubjectsPageState,
		SubjectsPageState,
	} from './subjects-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const subjectsPage = new SubjectsPageState(() => $page.url);
	setSubjectsPageState(subjectsPage);
	registerVersionInvalidation(subjectsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const selectedId = $derived(subjectsPage.selectedId);
	const query = subjectsPage.queryListPage();

	$effect(() => {
		const levelId = subjectsPage.selected?.gradeLevelId;
		if (levelId && $page.url.searchParams.get('gradeLevel') !== levelId) {
			const next = new URL($page.url);
			next.searchParams.set('gradeLevel', levelId);
			void appGoto(`${next.pathname}${next.search}`, { replaceState: true, noScroll: true });
		}
	});

	function selectSubject(subject: { id: string }, edit = false) {
		const path = detailHref.configSubjectTab(subject.id, 'progression');
		const target = new URL(`${path}${detailNavigationSearch($page.url)}`, $page.url);
		if (edit)
			target.searchParams.set('modal', 'edit-subject');
		openDetailDrawer(`${target.pathname}${target.search}`, currentRouteSurfaceHref($page.url));
	}

</script>

<PageQuery {query} cache={false} cacheKey={listRouteCacheKey} loadingTitle={$t('config.subjects')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('config.subjects')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<SubjectsList {selectedId} onSelect={selectSubject} onEdit={entity => selectSubject(entity, true)} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
