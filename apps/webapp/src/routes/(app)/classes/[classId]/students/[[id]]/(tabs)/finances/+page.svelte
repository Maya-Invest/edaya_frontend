<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getStudentFinanceTabState } from '../../../../../../school/students/[[id]]/(tabs)/finances/student-finance-tab.svelte';
	import StudentFinanceTab from '../../../../../../school/students/[[id]]/(tabs)/finances/StudentFinanceTab.svelte';
	import { getClassStudentsPageState } from '../../../class-students-page.svelte';

	const financeTab = getStudentFinanceTabState();
	const query = financeTab.query();
	const student = $derived(getClassStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.finances')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentFinanceTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
