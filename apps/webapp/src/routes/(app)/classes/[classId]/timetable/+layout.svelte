<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { queryClassTimetablePage } from '$lib/queries/planning.queries';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		TimetablePageState,
		setTimetablePageState,
	} from './timetable-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const timetablePage = new TimetablePageState(() => $page.params.classId ?? '');
	setTimetablePageState(timetablePage);
	registerVersionInvalidation(timetablePage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const classId = $derived($page.params.classId ?? '');
	const query = $derived(queryClassTimetablePage(classId, {
		seedData: data => timetablePage.seedData(data),
		loadTeacherConstraints: () => timetablePage.loadTeacherConstraints(),
	}));

	$effect(() => {
		if (!classId || !academicContext.shellReady) {
			return;
		}
		void timetablePage.loadTeacherConstraints();
	});
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('tab.timetable')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.timetable')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
