<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import SchoolStudentsView from '$lib/components/school/students/SchoolStudentsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { querySchoolStudentsPage } from '$lib/queries/people.queries';

	const selectedId = $derived($page.params.id);
	const query = querySchoolStudentsPage();

	function selectStudent(student: Student) {
		const path = detailHref.schoolStudent(student.id);
		appGoto(`${path}${$page.url.search}`);
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
			<SchoolStudentsView
				onSelect={selectStudent}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
