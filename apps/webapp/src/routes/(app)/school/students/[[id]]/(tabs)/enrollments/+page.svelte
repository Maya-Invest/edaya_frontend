<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { getStudentsPageState } from '../../../students-page.svelte';
	import { getStudentEnrollmentsTabState } from './student-enrollments-tab.svelte';
	import StudentEnrollmentsTab from './StudentEnrollmentsTab.svelte';

	const enrollmentsTab = getStudentEnrollmentsTabState();
	const query = enrollmentsTab.query();
	registerVersionInvalidation(enrollmentsTab);
	const student = $derived(getStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.enrollments')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentEnrollmentsTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
