<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t, locale } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { hasPermission } from '$lib/permissions';
	import AnnualProfile from '$lib/smart-components/annual-profile/AnnualProfile.svelte';
	import { getStudentEnrollmentsTabState } from './student-enrollments-tab.svelte';
	import StudentEnrollmentsTab from './StudentEnrollmentsTab.svelte';
	import SubjectParticipation from './SubjectParticipation.svelte';

	const { s }: { s: Student } = $props();
	const owner = getStudentEnrollmentsTabState();
	const history = owner.query('history');
	const subjects = owner.query('subjects');
	registerVersionInvalidation(owner);
	const canRead = $derived(hasPermission('ENROLLMENT_READ', { studentId: s.id, classId: s.classId }));
</script>
<div class="ui-student-enrollment space-y-6" data-testid="student-enrollment">
	<AnnualProfile flat kind="student" personId={s.id} name={s.name} classId={s.classId} />
	<DrawerField label={$t('profile.enrollmentDate')}><p class="text-sm">{s.enrollmentDate ? formatLocaleDate(s.enrollmentDate, $locale, { year: 'numeric', month: 'long', day: 'numeric' }) : $t('profile.notProvided')}</p></DrawerField>
	{#if canRead}
		{#if academicContext.yearId}<div id="optional-subjects"><PageQuery compactLoading query={subjects} cache={false} cacheKey={url => `${drawerTabRouteCacheKey(url)}:enrollments:subjects`}>
			{#snippet children(data)}<DataState compact status={data.status} errorMessage={data.errorMessage} preserveShell><SubjectParticipation studentId={s.id} studentName={s.name} /></DataState>{/snippet}
		</PageQuery></div>{:else}<p class="text-sm text-muted-foreground">{$t('academic.selectYear')}</p>{/if}
		<div id="class-history"><PageQuery compactLoading query={history} cache={false} cacheKey={url => `${drawerTabRouteCacheKey(url)}:enrollments:history`}>
			{#snippet children(data)}<DataState compact status={data.status} errorMessage={data.errorMessage} preserveShell><StudentEnrollmentsTab {s} /></DataState>{/snippet}
		</PageQuery></div>
	{/if}
</div>
