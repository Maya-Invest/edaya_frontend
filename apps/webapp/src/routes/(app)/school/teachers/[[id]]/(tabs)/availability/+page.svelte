<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { hasAnyPermission } from '$lib/permissions';
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherAvailabilityTab from './components/TeacherAvailabilityTab.svelte';
	import { getTeacherAvailabilityTabState } from './teacher-availability-tab.svelte';

	const teachersPage = getTeachersPageState();
	const availabilityTab = getTeacherAvailabilityTabState();
	const query = availabilityTab.query();
	const teacher = $derived(teachersPage.selected);
	const allowed = $derived(hasAnyPermission(['ACCESS_CONTROL_ASSIGN', 'SCHOOL_STRUCTURE_CONFIGURE']));
	const cacheKey = (url: URL) => `${url.pathname}|${academicContext.yearId}`;
</script>

<PageQuery {query} {cacheKey} loadingTitle={$t('teacher.availabilityTitle')}>
	{#snippet children(data)}
		<DataState preserveShell status={data.status} errorMessage={data.errorMessage}>
			{#if teacher && allowed}
				<TeacherAvailabilityTab {teacher} />
			{/if}
		</DataState>
	{/snippet}
</PageQuery>
