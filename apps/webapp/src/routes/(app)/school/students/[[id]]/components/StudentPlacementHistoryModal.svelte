<script lang="ts">
	import type { Student, StudentEnrollmentHistoryItem } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { getStudentEnrollmentsTabState } from '../(tabs)/enrollments/student-enrollments-tab.svelte';

	const { student, onClose }: { student: Student; onClose: () => void } = $props();
	const owner = getStudentEnrollmentsTabState();
	const status = $derived(owner.historyStatusFor(student.id));
	const rows = $derived(owner.enrollmentsFor(student.id).toSorted((a, b) => b.enrolledAt.localeCompare(a.enrolledAt) || b.id.localeCompare(a.id)));
	function statusLabel(value: StudentEnrollmentHistoryItem['status']) {
		return $t(value === 'active' ? 'student.enrollmentStatus.active' : 'student.enrollmentStatus.closed');
	}
	function endReasonLabel(reason: StudentEnrollmentHistoryItem['endReason']) {
		return reason ? $t(`student.enrollmentEndReason.${reason}`) : null;
	}
</script>

{#snippet placement(enrollment: StudentEnrollmentHistoryItem)}
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
			{enrollment.enrolledAt ? $t('student.enrolledAt', { date: formatLocaleDate(enrollment.enrolledAt, $locale, { year: 'numeric', month: 'short', day: 'numeric' }) }) : $t('student.enrollmentDateMissing')}
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
	</div>
{/snippet}
<Dialog.Root open onOpenChange={(open) => {
	if (!open)
		onClose();
}}>
	<Dialog.Content data-testid="student-placement-history" class="flex flex-col overflow-hidden" onCloseAutoFocus={(event) => {
		const trigger = document.querySelector<HTMLButtonElement>('.ui-student-identity button[aria-haspopup]');
		if (trigger) {
			event.preventDefault();
			trigger.focus();
		}
	}}>
		<Dialog.Header>
			<Dialog.Title>{$t('student.placementHistory')} · {student.name}</Dialog.Title>
			<Dialog.Description>{$t('student.placementHistoryDescription')}</Dialog.Description>
		</Dialog.Header>
		<div class="min-h-0 flex-1 overflow-y-auto">
			<DataState compact {...status} onRetry={() => void owner.retryHistory()}>
				<div class="divide-y divide-border">
					{#each rows as enrollment (enrollment.id)}
						<div data-placement-id={enrollment.id}>{@render placement(enrollment)}</div>
					{:else}<p class="text-sm text-muted-foreground">{$t('student.noEnrollments')}</p>{/each}
				</div>
			</DataState>
		</div>
		<Dialog.Footer><Button variant="outline" onclick={onClose}>{$t('common.close')}</Button></Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
