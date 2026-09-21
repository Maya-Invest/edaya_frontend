<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { entityVersions } from '$lib/entity-versions.svelte';
	import { t } from '$lib/i18n';
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherFamilyFeedbackTab from './components/TeacherFamilyFeedbackTab.svelte';
	import { getTeacherFamilyFeedbackTabState } from './teacher-family-feedback-tab.svelte';

	const feedbackTab = getTeacherFamilyFeedbackTabState();
	const query = feedbackTab.query();
	const teacher = $derived(getTeachersPageState().selected);
	const cacheKey = $derived((url: URL) =>
		`${drawerTabRouteCacheKey(url)}:${academicContext.yearId}:${entityVersions.familyFeedback}`);
</script>

{#if teacher}
	<PageQuery {query} cacheKey={cacheKey} loadingTitle={$t('drawer.tab.familyFeedback')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<TeacherFamilyFeedbackTab {teacher} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
