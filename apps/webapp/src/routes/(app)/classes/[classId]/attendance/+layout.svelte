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
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		AttendancePageState,
		setAttendancePageState,
	} from './attendance-page.svelte';
	import AttendanceList from './components/AttendanceList.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const attendancePage = new AttendancePageState(() => $page.url);
	setAttendancePageState(attendancePage);
	registerVersionInvalidation(attendancePage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const classId = $derived($page.params.classId ?? '6a');
	const selectedId = $derived(attendancePage.selectedId);
	const query = $derived(attendancePage.queryListPage(classId));

	function selectDay(day: import('$lib/types/school').AttendanceDay) {
		const path = detailHref.classAttendanceDay(classId, day.id);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('tab.attendance')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.attendance')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<AttendanceList {classId} {selectedId} onSelect={selectDay} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
