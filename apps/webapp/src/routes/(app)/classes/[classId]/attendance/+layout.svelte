<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { bindUrlModal } from '$lib/modal/modal-state.svelte';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import {
		AttendancePageState,
		setAttendancePageState,
	} from './attendance-page.svelte';
	import AttendanceCreateModal from './components/AttendanceCreateModal.svelte';
	import AttendanceList from './components/AttendanceList.svelte';
	import AttendancePageHydrator from './components/AttendancePageHydrator.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const attendancePage = new AttendancePageState(() => $page.url);
	setAttendancePageState(attendancePage);
	registerVersionInvalidation(attendancePage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const classId = $derived($page.params.classId ?? '');
	const selectedId = $derived(attendancePage.selectedId);
	const query = $derived(attendancePage.queryListPage(classId));

	const createOpen = bindUrlModal(attendancePage.modals, 'attendance-roll-call');
	$effect(() => attendancePage.hydrateTask());

	function createdDay(day: import('$lib/types/school').AttendanceDay) {
		attendancePage.modals.close();
		selectDay(day);
	}

	function selectDay(day: import('$lib/types/school').AttendanceDay) {
		const path = detailHref.classAttendanceDay(classId, day.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('tab.attendance')}>
	{#snippet children(data)}
		<AttendancePageHydrator {data} />
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.attendance')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<AttendanceList {classId} {selectedId} onSelect={selectDay} />
			{#if !createOpen.open}{@render pageChildren()}{/if}
		</DataState>
	{/snippet}
</PageQuery>

{#if createOpen.open}
	{#key attendancePage.scope}
		<AttendanceCreateModal bind:open={createOpen.open} onSaved={createdDay} />
	{/key}
{/if}
