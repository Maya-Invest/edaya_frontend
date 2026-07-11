<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { hasAnyPermission } from '$lib/permissions';
	import { resolvePageLoad } from '$lib/queries/page-status';
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherAvailabilityTab from './components/TeacherAvailabilityTab.svelte';

	const teachersPage = getTeachersPageState();
	const teacher = $derived(teachersPage.selected);
	const teacherId = $derived($page.params.id ?? '');
	const allowed = $derived(hasAnyPermission(['ACCESS_CONTROL_ASSIGN', 'SCHOOL_STRUCTURE_CONFIGURE']));
	const cacheKey = (url: URL) => `${url.pathname}|${academicContext.yearId}`;
	const query = $derived((url: URL) => resolvePageLoad(url, {
		empty: () => ({ teacherId }),
		load: async () => {
			if (!allowed)
				return { teacherId };
			await teachersPage.loadTeacherUnavailabilities(teacherId);
			return { teacherId };
		},
		hasItems: () => true,
		errorMessage: 'Unable to load teacher availability.',
	}));
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
