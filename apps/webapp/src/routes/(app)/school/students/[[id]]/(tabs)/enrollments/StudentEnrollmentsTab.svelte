<script lang="ts">
	import type { Student, StudentEnrollmentHistoryItem } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DocumentPdfButton from '$lib/components/school/documents/DocumentPdfButton.svelte';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { GraduationCap } from '$lib/icons';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { getStudentEnrollmentsTabState } from './student-enrollments-tab.svelte';

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
		void enrollmentsTab.loadProgressionClasses(s.id);
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

<div class="space-y-4" data-testid="student-placement-history">
	<div>
		<h4 class="text-sm font-semibold">
			{$t('student.profile.history')} · {enrollments.length}
		</h4>
		<div class="mt-4 divide-y divide-border">
			{#if enrollments.length === 0}
				<DrawerEmptyState label={$t('student.noEnrollments')}>
					{#snippet icon()}
						<GraduationCap class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each enrollments as enrollment (enrollment.id)}
					<div class="space-y-3 py-4 first:pt-0 last:pb-0">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-sm font-semibold">{enrollment.className}</p>
								<p class="mt-0.5 font-sans tabular-nums text-xs text-muted-foreground">
									{academicContext.years.find(year => year.id === enrollment.academicYearId)?.label ?? $t('dataState.unavailable')}
								</p>
							</div>
							<span class="rounded bg-secondary px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
								{statusLabel(enrollment.status)}
							</span>
						</div>
						<p class="mt-2 font-sans tabular-nums text-xs text-muted-foreground">
							{$t('student.enrolledAt', { date: formatLocaleDate(enrollment.enrolledAt, $locale, { year: 'numeric', month: 'short', day: 'numeric' }) })}
							{#if enrollment.endedAt}
								· {$t('student.endedAt', { date: formatLocaleDate(enrollment.endedAt, $locale, { year: 'numeric', month: 'short', day: 'numeric' }) })}
							{/if}
						</p>
						{#if endReasonLabel(enrollment.endReason)}
							<p class="mt-1 text-xs text-muted-foreground">
								{endReasonLabel(enrollment.endReason)}
							</p>
						{/if}
						{#if enrollment.progressionDecision}<p class="text-sm">{$t('profile.progressionDecision')}: {$t(`profile.progression.${enrollment.progressionDecision}`)}</p>{/if}
						{#if enrollment.progressionNotes}<p class="whitespace-pre-wrap break-words text-sm">{enrollment.progressionNotes}</p>{/if}
						{#if enrollment.progressionDecidedAt || enrollment.progressionDecidedBy || enrollment.closedBy || enrollment.previousEnrollmentId}<details class="ui-student-audit"><summary>{$t('student.profile.technicalDetails')}</summary><div class="space-y-2 text-xs text-muted-foreground">
							{#if enrollment.progressionDecidedAt}<p>{formatLocaleDate(enrollment.progressionDecidedAt, $locale, { year: 'numeric', month: 'short', day: 'numeric' })}</p>{/if}
							{#if enrollment.progressionDecidedBy}<p>{$t('profile.progressionDecision')}: {enrollment.progressionDecidedBy}</p>{/if}
							{#if enrollment.closedBy}<p>{$t('profile.closedBy')}: {enrollment.closedBy}</p>{/if}
							{#if enrollment.previousEnrollmentId}<p>{$t('profile.previousEnrollment')}: {enrollment.previousEnrollmentId}</p>{/if}
						</div></details>{/if}
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
</div>

<FormModal {open} onOpenChange={(value) => {
	if (!value)
		modals.close();
}} title={$t('profile.progression')} submitLabel={$t('common.save')} {busy} submitDisabled={!effectiveAt || (action === 'promote' && !nextClassGroupId)} onSubmit={save}>
	<label>{$t('profile.action')}<SelectField bind:value={action} class="w-full border bg-background">{#each selected?.status === 'active' ? ['complete', 'withdraw', 'graduate', 'promote'] : ['decision'] as value (value)}<option {value}>{$t(`profile.enrollmentAction.${value}`)}</option>{/each}</SelectField></label>
	{#if action === 'decision'}<label>{$t('profile.progressionDecision')}<SelectField bind:value={decision} class="w-full border bg-background">{#each ['promoted', 'retained', 'graduated'] as value (value)}<option {value}>{$t(`profile.progression.${value}`)}</option>{/each}</SelectField></label>{/if}
	{#if action === 'promote'}<label>{$t('student.class')}<SelectField bind:value={nextClassGroupId} class="w-full border bg-background"><option value="">{$t('profile.notConfigured')}</option>{#each enrollmentsTab.progressionClasses.filter(row => row.academicYearId !== selected?.academicYearId) as row (row)}<option value={row.id}>{row.name} · {academicContext.years.find(year => year.id === row.academicYearId)?.label ?? $t('dataState.unavailable')}</option>{/each}</SelectField></label>{/if}
	<label>{$t('profile.effectiveAt')}<input type="date" bind:value={effectiveAt} class="ui-field h-10 w-full rounded-collection border bg-background px-3" /></label>
	<label>{$t('profile.notes')}<textarea bind:value={notes} class="min-h-24 w-full rounded-collection border bg-background p-3"></textarea></label>
</FormModal>
