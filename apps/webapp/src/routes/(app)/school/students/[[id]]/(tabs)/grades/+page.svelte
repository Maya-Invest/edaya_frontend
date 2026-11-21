<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { entityVersions } from '$lib/entity-versions.svelte';
	import { t } from '$lib/i18n';
	import { onDestroy } from 'svelte';
	import { getStudentsPageState } from '../../../students-page.svelte';
	import StudentGradesTab from './components/StudentGradesTab.svelte';
	import { getStudentGradesTabState } from './student-grades-tab.svelte';

	const gradesTab = getStudentGradesTabState();
	onDestroy(() => gradesTab.cancelMore());
	const query = gradesTab.query();
	const student = $derived(getStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cache={false} cacheKey={url => `${drawerTabRouteCacheKey(url)}|grades|${entityVersions.evaluations}${JSON.stringify(url.searchParams.get('subject'))}`} loadingTitle={$t('drawer.tab.grades')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentGradesTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
