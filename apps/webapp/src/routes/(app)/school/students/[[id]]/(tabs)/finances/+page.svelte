<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { getStudentsPageState } from '../../../students-page.svelte';
	import { getStudentFinanceTabState } from './student-finance-tab.svelte';
	import StudentFinanceTab from './StudentFinanceTab.svelte';

	const financesTab = getStudentFinanceTabState();
	const query = financesTab.query();
	registerVersionInvalidation(financesTab);
	const student = $derived(getStudentsPageState().selected);
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
