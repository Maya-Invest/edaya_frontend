<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { civilDateTimeInTimeZoneToIso, isoToZonedDateAndTime } from '$lib/date/format';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { hasPermission } from '$lib/permissions';
	import SubjectEnrollmentModal from '$lib/smart-components/subject-enrollment/SubjectEnrollmentModal.svelte';
	import { SubjectStudentsState } from './subject-students.svelte';

	const participationState = new SubjectStudentsState();
	registerVersionInvalidation(participationState);
	const id = $derived($page.params.id ?? '');
	const query = $derived(participationState.query(id));
	const zone = $derived(academicContext.schools.find(s => s.id === academicContext.schoolScopeId)?.timeZone ?? 'UTC');
	const modals = createUrlSyncedModals({ allowed: ['subject-roster'], getUrl: () => $page.url });
	$effect(() => modals.hydrate());
	const classId = $derived($page.params.classId ?? '');
	const context = $derived(modals.active === 'subject-roster' && participationState.optional && hasPermission('ENROLLMENT_MANAGE', { classId })
		? {
			schoolId: academicContext.schoolScopeId,
			academicYearId: academicContext.yearId,
			classGroupId: classId,
			className: academicContext.classes.find(row => row.id === classId)?.name ?? classId,
			yearName: academicContext.years.find(row => row.id === academicContext.yearId)?.label ?? academicContext.yearId,
			zone,
			students: participationState.placements.filter(row => row.classGroupId === classId && row.academicYearId === academicContext.yearId && row.status === 'active' && (!row.endedAt || row.endedAt > new Date().toISOString())).map((placement) => {
				const student = participationState.students.find(row => row.id === placement.studentId);
				return { id: placement.studentId, name: student ? `${student.lastName} ${student.firstName}` : placement.studentId, enrollmentId: placement.id };
			}),
			classSubjectId: id,
			chooseStudents: true,
		}
		: null);
	async function changeDate(value: string) {
		const url = new URL($page.url);
		url.searchParams.set('rosterAt', civilDateTimeInTimeZoneToIso(value, '00:00', zone));
		await appGoto(`${url.pathname}${url.search}`, { noScroll: true, keepFocus: true });
	}
</script>
<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('participation.students')}>
	{#snippet children(data)}
		<DataState status={data.status} errorMessage={data.errorMessage}>
			<div class="space-y-4">
				<label>{$t('participation.asOf')}<Input type="date" value={isoToZonedDateAndTime($page.url.searchParams.get('rosterAt') ?? new Date().toISOString(), zone).date} onchange={event => changeDate(event.currentTarget.value)} /></label>
				{#if participationState.roster?.basis === 'unavailable'}
					<p class="text-sm text-muted-foreground">{$t('participation.historicalUnavailable')}</p>
				{:else}
					<p class="font-semibold">{$t('participation.students')} · {participationState.roster?.count ?? 0}</p>
					{#each participationState.roster?.students ?? [] as student (student.id)}<p class="rounded-collection border p-3">{student.lastName} {student.firstName}</p>{/each}
				{/if}
				{#if participationState.optional && hasPermission('ENROLLMENT_MANAGE', { classId: $page.params.classId })}<Button onclick={() => modals.open('subject-roster')}>{$t('participation.bulk')}</Button>{/if}
			</div>
		</DataState>
	{/snippet}
</PageQuery>
<SubjectEnrollmentModal {context} onClose={() => modals.close()} onSaved={() => participationState.invalidateIfStale()} />
