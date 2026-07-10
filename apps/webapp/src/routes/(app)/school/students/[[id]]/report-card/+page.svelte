<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getStudentsPageState } from '../../students-page.svelte';
	import StudentReportCardPanel from './StudentReportCardPanel.svelte';

	const studentsPage = getStudentsPageState();
	const query = studentsPage.queryReportCardTab();
	const student = $derived(studentsPage.selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.reportCard')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentReportCardPanel s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
