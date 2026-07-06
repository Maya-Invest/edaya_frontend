<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import StudentsView from '$lib/components/school/students/StudentsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryClassStudentsPage } from '$lib/queries/people.queries';

	const selectedId = $derived($page.params.id);
	const classId = $derived($page.params.classId ?? '6a');
	const query = $derived(queryClassStudentsPage(classId));

	function selectStudent(student: Student) {
		const path = detailHref.classStudent(classId, student.id);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<PageQuery {query} loadingTitle={$t('tab.students')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('tab.students')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			{#if data.currentClass}
				<StudentsView
					classId={data.classId}
					className={data.currentClass.name}
					classLevel={data.currentClass.level}
					onSelect={selectStudent}
					{selectedId}
				/>
			{/if}
		</DataState>
	{/snippet}
</PageQuery>
