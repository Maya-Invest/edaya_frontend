<script lang="ts">
	import type { SubjectSelection } from '$lib/subjects/subject-selection';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { selectionChanged, selectionFor } from '$lib/subjects/subject-selection';
	import SubjectSelectionFields from '$lib/subjects/SubjectSelectionFields.svelte';
	import { getStudentEnrollmentsTabState } from './student-enrollments-tab.svelte';

	const { studentId }: { studentId: string } = $props();
	const participationState = getStudentEnrollmentsTabState();
	const data = $derived(participationState.slice?.studentId === studentId ? participationState.slice.participation : undefined);
	const zone = $derived(academicContext.schools.find(s => s.id === academicContext.schoolScopeId)?.timeZone ?? 'UTC');
	const now = new Date().toISOString();
	const placements = $derived(data?.placements.filter(row => row.academicYearId === academicContext.yearId && (!row.endedAt || row.endedAt > now)) ?? []);
	const offerings = $derived(data?.offerings.filter(row => row.isOptional && row.isOffered && placements.some(placement => placement.classGroupId === row.classGroupId)) ?? []);
	const modals = createUrlSyncedModals({ allowed: ['subject-selection'], getUrl: () => $page.url });
	let selection = $state<SubjectSelection>({ scope: 'annual' });
	let busy = $state(false);
	let initializedModal = '';
	let expectedRevision = $state(0);
	const offering = $derived(offerings.find(row => row.id === modals.target));
	const placement = $derived(placements.find(row => row.classGroupId === offering?.classGroupId));
	const selected = $derived(data?.enrollments.find(row => row.studentClassEnrollmentId === placement?.id && row.classSubjectId === offering?.id));
	const periods = $derived(data?.periods.filter(row => row.academicYearId === placement?.academicYearId) ?? []);
	$effect(() => modals.hydrate());
	$effect(() => {
		if (modals.active && (!data || !offering))
			return;
		const key = `${studentId}:${academicContext.yearId}:${modals.active ?? ''}:${modals.target ?? ''}`;
		if (key === initializedModal)
			return;
		initializedModal = key;
		if (modals.active && offering) {
			selection = selected ? selectionFor(selected) : { scope: 'annual' };
			expectedRevision = offering.participationRevision ?? 0;
		}
	});
	async function save() {
		if (!offering || !placement || !selectionChanged(selection, selected))
			return;
		busy = true;
		try {
			if (await participationState.manageParticipation({ requestId: crypto.randomUUID(), expectedRevisions: { [offering.id]: expectedRevision }, operations: [{ studentClassEnrollmentId: placement.id, classSubjectId: offering.id, selection }] }))
				modals.close();
			else expectedRevision = data?.offerings.find(row => row.id === offering.id)?.participationRevision ?? expectedRevision;
		}
		finally { busy = false; }
	}
</script>

<section class="space-y-3" aria-label={$t('participation.title')}>
	<h3 class="font-semibold">{$t('participation.title')}</h3>
	{#each offerings as subject (subject.id)}
		{@const enrolled = data?.enrollments.find(row => row.classSubjectId === subject.id && placements.some(placement => placement.id === row.studentClassEnrollmentId))}
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
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
<FormModal open={Boolean(modals.active && offering && placement && hasPermission('ENROLLMENT_MANAGE', { classId: offering.classGroupId }))} onOpenChange={(value) => {
	if (!value)
		modals.close();
}} title={`${$t('participation.title')} · ${offering?.name ?? ''}`} cancelLabel={$t('common.cancel')} submitLabel={$t(selection.scope === 'none' ? 'participation.withdraw' : selected ? 'common.save' : 'participation.enroll')} {busy} submitDisabled={!selectionChanged(selection, selected)} onSubmit={save}>
	<SubjectSelectionFields bind:selection {periods} {zone} />
</FormModal>
