<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readClassStudentListFilters } from '$lib/list/list-url-filters';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import { untrack } from 'svelte';
	import {
		ClassStudentsPageState,
		setClassStudentsPageState,
	} from './class-students-page.svelte';
	import ClassStudentsList from './components/ClassStudentsList.svelte';
	import ClassStudentsPageHydrator from './components/ClassStudentsPageHydrator.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const classStudentsPage = new ClassStudentsPageState(() => $page.url);
	setClassStudentsPageState(classStudentsPage);
	registerVersionInvalidation(classStudentsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const classId = $derived($page.params.classId ?? '6a');
	const selectedId = $derived(classStudentsPage.selectedId);
	const query = $derived(classStudentsPage.queryListPage(classId));

	const urlFilters = $derived(readClassStudentListFilters($page.url));

	$effect(() => {
		classStudentsPage.filters.hydrate(urlFilters);
	});

	$effect(() => {
		const scope = JSON.stringify([authSession.subjectId, authSession.schoolId, academicContext.yearId, authSession.grants, classId, classStudentsPage.filters.values.q, classStudentsPage.filters.values.status]);
		untrack(() => classStudentsPage.selection.syncScope(scope));
	});

	function selectStudent(student: import('$lib/types/school').Student) {
		const path = detailHref.classStudent(classId, student.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('tab.students')}>
	{#snippet children(data)}
		<ClassStudentsPageHydrator {data} />
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.students')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ClassStudentsList {classId} {selectedId} onSelect={selectStudent} />
		</DataState>
	{/snippet}
</PageQuery>

{@render pageChildren()}
