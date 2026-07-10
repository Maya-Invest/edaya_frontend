<script lang="ts">
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import StudentProfileTab from '../components/StudentProfileTab.svelte';
	import { queryStudentProfileTab } from '../students-detail.queries';
	import { getStudentsPageState } from '../students-page.svelte';

	const studentsPage = getStudentsPageState();
	const query = queryStudentProfileTab(studentsPage);
	const student = $derived(studentsPage.selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.profile')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentProfileTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
