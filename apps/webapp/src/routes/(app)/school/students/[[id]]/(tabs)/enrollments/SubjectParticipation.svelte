<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import SubjectEnrollmentModal from '$lib/smart-components/subject-enrollment/SubjectEnrollmentModal.svelte';
	import { getStudentEnrollmentsTabState } from './student-enrollments-tab.svelte';

	const { studentId, studentName = studentId }: { studentId: string; studentName?: string } = $props();
	const participationState = getStudentEnrollmentsTabState();
	const data = $derived(participationState.slice?.studentId === studentId ? participationState.slice.participation : undefined);
	const now = new Date().toISOString();
	const placements = $derived(data?.placements.filter(row => row.academicYearId === academicContext.yearId && row.status === 'active' && (!row.endedAt || row.endedAt > now)) ?? []);
	const offerings = $derived(data?.offerings.filter(row => row.isOptional && row.isOffered && placements.some(placement => placement.classGroupId === row.classGroupId)) ?? []);
	const modals = createUrlSyncedModals({ allowed: ['subject-selection'], getUrl: () => $page.url });
	const offering = $derived(offerings.find(row => row.id === modals.target));
	const placement = $derived(placements.find(row => row.classGroupId === offering?.classGroupId));
	$effect(() => modals.hydrate());
	const context = $derived(modals.active && offering && placement && hasPermission('ENROLLMENT_MANAGE', { classId: offering.classGroupId })
		? {
			schoolId: academicContext.schoolScopeId,
			academicYearId: academicContext.yearId,
			classGroupId: offering.classGroupId,
			className: academicContext.classes.find(row => row.id === offering.classGroupId)?.name ?? offering.classGroupId,
			yearName: academicContext.years.find(row => row.id === academicContext.yearId)?.label ?? academicContext.yearId,
			zone: academicContext.schools.find(row => row.id === academicContext.schoolScopeId)?.timeZone ?? 'UTC',
			students: [{ id: studentId, name: studentName, enrollmentId: placement.id }],
			classSubjectId: offering.id,
		}
		: null);
</script>

<section class="space-y-3" aria-label={$t('participation.title')}>
	<h4 class="text-sm font-semibold">{$t('participation.title')}</h4>
	{#each offerings as subject (subject.id)}
		{@const enrolled = data?.enrollments.find(row => row.classSubjectId === subject.id && placements.some(placement => placement.id === row.studentClassEnrollmentId))}
		<div class="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 last:border-b-0">
			<div class="min-w-0 space-y-1">
				<p class="font-medium">{subject.name}</p>
				<p class="text-sm text-muted-foreground">{!enrolled ? $t('participation.notEnrolled') : enrolled.scope === 'annual' ? $t('participation.annual') : enrolled.periods.map(period => data?.periods.find(row => row.id === period.periodId)?.name ?? period.periodId).join(', ')}</p>
			</div>
			{#if hasPermission('ENROLLMENT_MANAGE', { classId: subject.classGroupId })}
				<Button size="sm" variant="outline" aria-label={`${$t(enrolled ? 'participation.update' : 'participation.enroll')} · ${subject.name}`} onclick={() => modals.open('subject-selection', { target: subject.id })}>{$t(enrolled ? 'participation.update' : 'participation.enroll')}</Button>
			{/if}
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">{$t('participation.noOptionalSubjects')}</p>
	{/each}
</section>
<SubjectEnrollmentModal {context} onClose={() => modals.close()} onSaved={() => participationState.invalidateIfStale()} />
