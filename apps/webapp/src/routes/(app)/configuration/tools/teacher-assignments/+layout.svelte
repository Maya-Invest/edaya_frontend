<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import TeacherAssignmentsHubView from './components/TeacherAssignmentsHubView.svelte';
	import { readTeacherAssignmentsListFilters } from './lib/teacher-assignments-list-filters';
	import {
		setTeacherAssignmentsPageState,
		TeacherAssignmentsPageState,
	} from './teacher-assignments-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const hubPage = new TeacherAssignmentsPageState(() => $page.url);
	setTeacherAssignmentsPageState(hubPage);
	registerVersionInvalidation(hubPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = hubPage.queryListPage();
	const urlFilters = $derived(readTeacherAssignmentsListFilters($page.url));

	const academicSelectionKey = $derived(
		`${academicContext.shellReady}|${authSession.schoolId ?? ''}|${academicContext.yearId}`,
	);

	$effect(() => {
		hubPage.filters.hydrate(urlFilters);
	});

	$effect(() => {
		if (!academicContext.shellReady) {
			return;
		}
		void academicSelectionKey;
		void hubPage.refreshSlice();
	});
</script>

<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('tools.teacherAssignments.title')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tools.teacherAssignments.title')}
			emptyDescription={$t('tools.teacherAssignments.empty')}
		>
			<TeacherAssignmentsHubView />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
