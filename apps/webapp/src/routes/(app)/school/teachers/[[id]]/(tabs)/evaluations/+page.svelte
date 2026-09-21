<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { entityVersions } from '$lib/entity-versions.svelte';
	import { t } from '$lib/i18n';
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherEvaluationsTab from './components/TeacherEvaluationsTab.svelte';
	import { getTeacherEvaluationsTabState } from './teacher-evaluations-tab.svelte';

	const evaluationsTab = getTeacherEvaluationsTabState();
	const query = evaluationsTab.query();
	const teacher = $derived(getTeachersPageState().selected);
	const cacheKey = $derived((url: URL) =>
		`${drawerTabRouteCacheKey(url)}:${academicContext.periodId}:${entityVersions.evaluations}`);
</script>

{#if teacher}
	<PageQuery {query} cacheKey={cacheKey} loadingTitle={$t('drawer.tab.evaluations')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<TeacherEvaluationsTab {teacher} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
