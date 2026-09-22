<script lang="ts">
	import type { Student } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { readStudentListFilters } from '$lib/list/list-url-filters';
	import { bindUrlModal, closeUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import StudentCreateModal from './components/StudentCreateModal.svelte';
	import StudentsList from './components/StudentsList.svelte';
	import { studentListUsesFullRoster } from './lib/student-list-filters';
	import {
		StudentsPageState,
		setStudentsPageState,
	} from './students-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const studentsPage = new StudentsPageState(() => $page.url);
	setStudentsPageState(studentsPage);
	registerVersionInvalidation(studentsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const query = studentsPage.queryListPage();

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
		void studentsPage.filters.values.q;
		void studentsPage.filters.values.status;
		void studentsPage.filters.values.class;
		void studentsPage.filters.values.sort;
		void studentsPage.filters.values.photoReview;

		if (!studentListUsesFullRoster(studentsPage.filters.values)) {
			studentsPage.clearFullRoster();
			if (wasFullRoster) {
				void studentsPage.refreshList();
			}
			wasFullRoster = false;
			return;
		}

		wasFullRoster = true;
		void studentsPage.loadFullRoster();
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
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}

	function handleCreated(studentId: string) {
		const path = detailHref.schoolStudent(studentId);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<StudentCreateModal
	bind:open={createOpen.open}
	onOpenChange={closeUrlModal(modals)}
	hierarchy={studentsPage.hierarchy}
	createStudent={input => studentsPage.createStudent(input)}
	onCreated={handleCreated}
/>

<PageQuery {query} loadingTitle={$t('school.students')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.students')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<StudentsList
				onSelect={selectStudent}
				selectedId={studentsPage.selectedId}
				onCreate={() => {
					createOpen.open = true;
					modals.open('create');
				}}
			/>
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
