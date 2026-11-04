<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListEntityCards from '$lib/components/ui/ListEntityCards.svelte';
	import { t } from '$lib/i18n';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import SubjectEnrollmentModal from '$lib/smart-components/subject-enrollment/SubjectEnrollmentModal.svelte';
	import { getStudentEnrollmentsTabState } from './student-enrollments-tab.svelte';

	const { studentId, studentName = studentId }: { studentId: string; studentName?: string } = $props();
	const participationState = getStudentEnrollmentsTabState();
	const data = $derived(participationState.slice?.studentId === studentId ? participationState.slice.participation : undefined);
	const now = new Date().toISOString();
	const placement = $derived(data?.placements.find(row => row.academicYearId === academicContext.yearId && row.status === 'active' && (!row.endedAt || row.endedAt > now)));
	const offerings = $derived(data?.offerings.filter(row => row.isOptional && row.isOffered && row.classGroupId === placement?.classGroupId) ?? []);
	const modals = createUrlSyncedModals({ allowed: ['subject-selection'], getUrl: () => $page.url });
	const eligible = $derived(offerings.length > 0 && placement && hasPermission('ENROLLMENT_MANAGE', { classId: placement.classGroupId }));
	const validTarget = $derived(placement && (!modals.target || modals.target === placement.classGroupId || offerings.some(subject => subject.id === modals.target && subject.classGroupId === placement.classGroupId)));
	$effect(() => modals.hydrate());
	const context = $derived(modals.active && validTarget && eligible && placement
		? {
			schoolId: academicContext.schoolScopeId,
			academicYearId: academicContext.yearId,
			classGroupId: placement.classGroupId,
			className: academicContext.classes.find(row => row.id === placement.classGroupId)?.name ?? placement.classGroupId,
			yearName: academicContext.years.find(row => row.id === academicContext.yearId)?.label ?? academicContext.yearId,
			zone: academicContext.schools.find(row => row.id === academicContext.schoolScopeId)?.timeZone ?? 'UTC',
			students: [{ id: studentId, name: studentName, enrollmentId: placement.id }],
		}
		: null);
</script>

<section class="space-y-4" aria-label={$t('participation.title')}>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h3 class="ui-student-section-title">{$t('participation.title')}</h3>
		{#if eligible && placement}<Button size="sm" variant="outline" onclick={() => modals.open('subject-selection', { target: placement.classGroupId })}>{$t('participation.updateSubjects')}</Button>{/if}
	</div>
	<ListEntityCards rows={offerings} showEndSummary={false} emptyLabel={$t('participation.noOptionalSubjects')} columns={[
		{ key: 'name', label: $t('participation.title'), span: 1, card: { zone: 'body', showLabel: false } },
		{ key: 'scope', label: '', span: 1, card: { zone: 'body', showLabel: false } },
	]}>
		{#snippet field(subject, key)}
			{#if key === 'name'}<span class="font-semibold">{subject.name}</span>{:else}
				{@const enrolled = data?.enrollments.find(row => row.classSubjectId === subject.id && !row.deletedAt && row.studentClassEnrollmentId === placement?.id)}
				<span class="text-muted-foreground">{!enrolled ? $t('participation.notEnrolled') : enrolled.scope === 'annual' ? $t('participation.annual') : enrolled.periods.map(period => data?.periods.find(row => row.id === period.periodId)?.name ?? period.periodId).join(', ')}</span>
			{/if}
		{/snippet}
	</ListEntityCards>
</section>
<SubjectEnrollmentModal {context} onClose={() => modals.close()} onSaved={() => participationState.invalidateIfStale()} />
