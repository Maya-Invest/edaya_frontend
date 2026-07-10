<script lang="ts">
	import type { Student } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import StudentsList from './components/StudentsList.svelte';
	import { readStudentListFilters } from '$lib/list/list-url-filters';
	import { studentListUsesFullRoster } from './student-list-filters';
	import { querySchoolStudentsPage } from './students.queries';
	import {
		StudentsPageState,
		setStudentsPageState,
	} from './students-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const studentsPage = new StudentsPageState(() => $page.url);
	setStudentsPageState(studentsPage);
	registerVersionInvalidation(studentsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = querySchoolStudentsPage(studentsPage);

	const urlFilters = $derived(readStudentListFilters($page.url));

	let lastPagedFilterKey = $state('');
	let wasFullRoster = false;

	$effect(() => {
		studentsPage.filters.hydrate(urlFilters);
	});

	$effect(() => {
		if (!studentsPage.filters.ready) {
			return;
		}
		void studentsPage.filters.values.class;
		void studentsPage.filters.values.status;
		void studentsPage.filters.values.q;
		studentsPage.filters.scheduleSync();
	});

	$effect(() => {
		if (!studentsPage.filters.ready) {
			return;
		}
		void studentsPage.filters.values.q;
		void studentsPage.filters.values.status;
		void studentsPage.filters.values.class;

		if (!studentsPage.usesFullRoster) {
			studentsPage.clearFullRoster();
			if (wasFullRoster) {
				void studentsPage.refreshList();
			}
			wasFullRoster = false;
			return;
		}

		wasFullRoster = true;
		let cancelled = false;
		void studentsPage.loadFullRoster().finally(() => {
			if (cancelled) {
				return;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const key = JSON.stringify(urlFilters);
		const active = urlFilters.class !== 'all' || urlFilters.status !== 'all' || urlFilters.q.trim() !== '';

		if (!lastPagedFilterKey) {
			lastPagedFilterKey = key;
			if (active && !studentListUsesFullRoster(urlFilters)) {
				void studentsPage.refreshList();
			}
			return;
		}

		if (key !== lastPagedFilterKey && !studentListUsesFullRoster(urlFilters)) {
			void studentsPage.refreshList();
		}
		lastPagedFilterKey = key;
	});

	function selectStudent(student: Student) {
		const path = detailHref.schoolStudent(student.id);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<PageQuery {query} loadingTitle={$t('school.students')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.students')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<StudentsList onSelect={selectStudent} selectedId={studentsPage.selectedId} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
