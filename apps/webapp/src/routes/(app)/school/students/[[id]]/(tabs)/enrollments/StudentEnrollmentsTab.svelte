<script lang="ts">
	import type { Student, StudentEnrollmentHistoryItem } from '$lib/types/school';
	import { page } from '$app/stores';
	import DocumentPdfButton from '$lib/components/school/documents/DocumentPdfButton.svelte';
	import { fmtDateFr } from '$lib/components/school/shared/drawer-constants';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { locale, t } from '$lib/i18n';
	import { GraduationCap } from '$lib/icons';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { getStudentEnrollmentsTabState } from './student-enrollments-tab.svelte';
	import SubjectParticipation from './SubjectParticipation.svelte';

	const { s }: {
		s: Student;
	} = $props();
	const enrollmentsTab = getStudentEnrollmentsTabState();
	const enrollments = $derived(enrollmentsTab.enrollmentsFor(s.id));
	const modals = createUrlSyncedModals({ allowed: ['enrollment-progression'], getUrl: () => $page.url });
	const selected = $derived(enrollments.find(row => row.id === modals.target));
	const open = $derived(modals.active === 'enrollment-progression' && Boolean(selected));
	let action = $state<'complete' | 'withdraw' | 'graduate' | 'promote' | 'decision'>('complete');
	let decision = $state<'promoted' | 'retained' | 'graduated'>('retained');
	let effectiveAt = $state('');
	let notes = $state('');
	let nextClassGroupId = $state('');
	let busy = $state(false);
	$effect(() => modals.hydrate());
	function edit(enrollment: StudentEnrollmentHistoryItem) {
		void enrollmentsTab.loadProgressionClasses();
		action = enrollment.status === 'active' ? 'complete' : 'decision';
		decision = enrollment.progressionDecision ?? 'retained';
		effectiveAt = new Date().toISOString().slice(0, 10);
		notes = enrollment.progressionNotes ?? '';
		modals.open('enrollment-progression', { target: enrollment.id });
	}
	async function save() {
		if (!selected || !effectiveAt || !hasPermission('ENROLLMENT_MANAGE', { classId: selected.classGroupId }))
			return;
		busy = true;
		try {
			if (await enrollmentsTab.updateProgression({ enrollmentId: selected.id, action, decision, effectiveAt: new Date(effectiveAt).toISOString(), notes, nextClassGroupId }))
				modals.close();
		}
		finally {
			busy = false;
		}
	}
	function statusLabel(status: StudentEnrollmentHistoryItem['status']): string {
		return status === 'active'
			? $t('student.enrollmentStatus.active')
			: $t('student.enrollmentStatus.closed');
	}
	function endReasonLabel(reason: StudentEnrollmentHistoryItem['endReason']): string | null {
		if (!reason) {
			return null;
		}
		return $t(`student.enrollmentEndReason.${reason}`);
	}
</script>

<div class="space-y-4">
	<div>
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('student.class')} · {enrollments.length}
		</Label>
		<div class="mt-2 space-y-2">
			{#if enrollments.length === 0}
				<DrawerEmptyState label={$t('student.noEnrollments')}>
					{#snippet icon()}
						<GraduationCap class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each enrollments as enrollment (enrollment.id)}
					<div class="rounded-xl border border-border bg-card p-3">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-sm font-semibold">{enrollment.className}</p>
								<p class="mt-0.5 font-sans tabular-nums text-[10px] text-muted-foreground">
									{enrollment.academicYearId}
								</p>
							</div>
							<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								{statusLabel(enrollment.status)}
							</span>
						</div>
						<p class="mt-2 font-sans tabular-nums text-[10px] text-muted-foreground">
							{$t('student.enrolledAt', { date: fmtDateFr(enrollment.enrolledAt, $locale) })}
							{#if enrollment.endedAt}
								· {$t('student.endedAt', { date: fmtDateFr(enrollment.endedAt, $locale) })}
							{/if}
						</p>
						{#if endReasonLabel(enrollment.endReason)}
							<p class="mt-1 text-xs text-muted-foreground">
								{endReasonLabel(enrollment.endReason)}
							</p>
						{/if}
						<div class="mt-2 space-y-1 text-xs text-muted-foreground">
							{#if enrollment.progressionDecision}<p>{$t('profile.progressionDecision')}: {$t(`profile.progression.${enrollment.progressionDecision}`)} · {enrollment.progressionDecidedAt ?? ''} · {enrollment.progressionDecidedBy ?? ''}</p>{/if}
							{#if enrollment.progressionNotes}<p>{enrollment.progressionNotes}</p>{/if}
							{#if enrollment.closedBy}<p>{$t('profile.closedBy')}: {enrollment.closedBy}</p>{/if}
							{#if enrollment.previousEnrollmentId}<p>{$t('profile.previousEnrollment')}: {enrollment.previousEnrollmentId}</p>{/if}
						</div>
						<div class="mt-3 flex flex-wrap gap-2">
							{#if hasPermission('ENROLLMENT_MANAGE', { classId: enrollment.classGroupId }) && (enrollment.status === 'active' || enrollment.endReason === 'completed')}<Button size="sm" variant="outline" onclick={() => edit(enrollment)}>{$t('profile.progression')}</Button>{/if}
							{#if enrollment.status === 'active'}
								<DocumentPdfButton onRequestDocumentIssuance={enrollmentsTab.performRequestDocumentIssuance}
									templateKey="schooling-certificate.v1"
									sourceId={enrollment.id}
									studentId={s.id}
									permission="ENROLLMENT_READ"
									classId={s.classId}
								/>
								<DocumentPdfButton onRequestDocumentIssuance={enrollmentsTab.performRequestDocumentIssuance}
									templateKey="enrollment-record.v1"
									sourceId={enrollment.id}
									studentId={s.id}
									permission="ENROLLMENT_READ"
									classId={s.classId}
								/>
							{:else if enrollment.endReason === 'withdrawn'}
								<DocumentPdfButton onRequestDocumentIssuance={enrollmentsTab.performRequestDocumentIssuance}
									templateKey="withdrawal-certificate.v1"
									sourceId={enrollment.id}
									studentId={s.id}
									permission="ENROLLMENT_READ"
									classId={s.classId}
								/>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
	<SubjectParticipation studentId={s.id} studentName={s.name} />
</div>

<FormModal {open} onOpenChange={(value) => {
	if (!value)
		modals.close();
}} title={$t('profile.progression')} submitLabel={$t('common.save')} {busy} submitDisabled={!effectiveAt || (action === 'promote' && !nextClassGroupId)} onSubmit={save}>
	<label>{$t('profile.action')}<select bind:value={action} class="h-10 w-full rounded-lg border bg-background px-3">{#each selected?.status === 'active' ? ['complete', 'withdraw', 'graduate', 'promote'] : ['decision'] as value (value)}<option {value}>{$t(`profile.enrollmentAction.${value}`)}</option>{/each}</select></label>
	{#if action === 'decision'}<label>{$t('profile.progressionDecision')}<select bind:value={decision} class="h-10 w-full rounded-lg border bg-background px-3">{#each ['promoted', 'retained', 'graduated'] as value (value)}<option {value}>{$t(`profile.progression.${value}`)}</option>{/each}</select></label>{/if}
	{#if action === 'promote'}<label>{$t('student.class')}<select bind:value={nextClassGroupId} class="h-10 w-full rounded-lg border bg-background px-3"><option value="">{$t('profile.notConfigured')}</option>{#each enrollmentsTab.progressionClasses.filter(row => row.academicYearId !== selected?.academicYearId) as row (row)}<option value={row.id}>{row.name} · {row.academicYearId}</option>{/each}</select></label>{/if}
	<label>{$t('profile.effectiveAt')}<input type="date" bind:value={effectiveAt} class="h-10 w-full rounded-lg border bg-background px-3" /></label>
	<label>{$t('profile.notes')}<textarea bind:value={notes} class="min-h-24 w-full rounded-lg border bg-background p-3"></textarea></label>
</FormModal>
