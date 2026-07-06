<script lang="ts">
	import { page } from '$app/stores';
	import TeachersView from '$lib/components/school/teachers/TeachersView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { querySchoolTeachersPage } from '$lib/queries/people.queries';

	const selectedId = $derived($page.params.id);
	const query = querySchoolTeachersPage();
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
			<TeachersView
				onSelect={teacher => appGoto(detailHref.schoolTeacher(teacher.id))}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
