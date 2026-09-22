<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { readTeacherListFilters } from '$lib/list/list-url-filters';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import TeachersList from './components/TeachersList.svelte';
	import { teacherListUsesFullRoster } from './lib/teacher-list-filters';
	import {
		TeachersPageState,
		setTeachersPageState,
	} from './teachers-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const teachersPage = new TeachersPageState(() => $page.url);
	setTeachersPageState(teachersPage);
	registerVersionInvalidation(teachersPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = teachersPage.queryListPage();
	const urlFilters = $derived(readTeacherListFilters($page.url));

	let wasFullRoster = false;

	$effect(() => {
		teachersPage.filters.hydrate(urlFilters);
	});

	$effect(() => {
		if (!teachersPage.filters.ready) {
			return;
		}
		void teachersPage.filters.values.q;
		void teachersPage.filters.values.sort;
		void teachersPage.filters.values.status;

		if (!teacherListUsesFullRoster(teachersPage.filters.values)) {
			teachersPage.clearFullRoster();
			if (wasFullRoster) {
				void teachersPage.refreshList();
			}
			wasFullRoster = false;
			return;
		}

		wasFullRoster = true;
		void teachersPage.loadFullRoster();
	});

	function selectTeacher(teacher: Teacher) {
		const path = detailHref.schoolTeacherTab(teacher.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} loadingTitle={$t('school.teachers')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.teachers')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<TeachersList onSelect={selectTeacher} selectedId={teachersPage.selectedId} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
