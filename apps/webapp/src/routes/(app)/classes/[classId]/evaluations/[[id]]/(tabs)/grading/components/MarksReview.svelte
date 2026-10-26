<script lang="ts">
	import type { MarksReview } from '../../../../lib/grading-task';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { formatLocaleTimestamp } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { openRouteSurface } from '$lib/navigation/route-surface-navigation';
	import { hasPermission } from '$lib/permissions';
	import { onDestroy, untrack } from 'svelte';
	import { getEvaluationsPageState } from '../../../../evaluations-page.svelte';
	import { gradingTaskHref } from '../../../../lib/grading-task';
	import { getEvaluationGradingTabState } from '../evaluation-grading-tab.svelte';

	const pageState = getEvaluationsPageState();
	const grading = getEvaluationGradingTabState();
	const modals = createUrlSyncedModals({ allowed: ['submit-marks', 'approve-correction', 'reject-correction', 'withdraw-correction'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const submit = bindUrlModal(modals, 'submit-marks');
	const approve = bindUrlModal(modals, 'approve-correction');
	const reject = bindUrlModal(modals, 'reject-correction');
	const withdraw = bindUrlModal(modals, 'withdraw-correction');
	let reason = $state('');
	let busy = $state(false);
	let approving = $state('');
	let snapshot = $state<MarksReview | null>(null);
	let scope = '';
	let session = 0;
	const selectedCorrection = $derived(snapshot?.corrections.find(row => row.id === modals.target));
	$effect(() => {
		const identity = [modals.active, modals.target, pageState.scope];
		untrack(() => {
			session += 1;
			busy = false;
			approving = '';
			reason = '';
			scope = pageState.scope;
			snapshot = identity[0] && grading.review ? structuredClone($state.snapshot(grading.review)) : null;
		});
	});
	onDestroy(() => {
		session += 1;
	});
	function name(studentId: string) {
		const student = grading.review?.students.find(row => row.id === studentId);
		return student ? `${student.firstName} ${student.lastName}` : studentId;
	}
	function display(value: { mentionId?: string | null; score?: number | null; designation?: string; notes?: string | null }) {
		const label = value.designation === 'absent' || value.designation === 'exempt'
			? $t(`marks.${value.designation}`)
			: value.mentionId ? `${value.mentionId} · ${$t('reportCards.contextUnavailable')}` : value.score?.toString() ?? $t('value.notProvided');
		return `${label}${value.notes ? ` · ${value.notes}` : ''}`;
	}
	async function approveImmediately(correctionId: string) {
		if (approving || !grading.review)
			return;
		const capture = session;
		const review = structuredClone($state.snapshot(grading.review));
		approving = correctionId;
		try {
			await pageState.reviewMarks('approve', { snapshot: review, scope: pageState.scope, correctionId });
		}
		finally {
			if (capture === session)
				approving = '';
		}
	}
	async function confirm(action: 'submit' | 'approve' | 'reject' | 'withdraw') {
		if (busy || !snapshot || scope !== pageState.scope)
			return;
		const capture = session;
		busy = true;
		try {
			if (await pageState.reviewMarks(action, { reason, correctionId: selectedCorrection?.id, snapshot, scope }) && capture === session) {
				reason = '';
				modals.close();
			}
		}
		finally {
			if (capture === session)
				busy = false;
		}
	}
</script>
{#if grading.review}
	<section class="space-y-4 pt-6">
		<p>{$t('marks.status', { state: $t(`marks.${grading.review.assessment.marksStatus}`), revision: String(grading.review.assessment.marksRevision) })}</p>
		{#if grading.review.assessment.marksStatus === 'draft'}<p>{$t('marks.incomplete', { count: String(grading.review.missingStudentIds.length) })}</p>{/if}
		{#if grading.review.publishedResultIds.length}<p>{$t('marks.publishedLocked', { count: String(grading.review.publishedResultIds.length) })}</p>{/if}
		{#if pageState.canEnterMarks(grading.review.assessment.id) && (grading.review.allowedActions.submit || grading.review.allowedActions.requestCorrection)}
			<RowActionMenu label={$t('gradeInspection.sectionActions')}>
				{#if grading.review.allowedActions.submit && pageState.canEnterMarks(grading.review.assessment.id)}<Button variant="ghost" class="w-full justify-start" onclick={() => submit.open = true}>{$t('marks.submit')}</Button>{/if}
				{#if grading.review.allowedActions.requestCorrection && pageState.canEnterMarks(grading.review.assessment.id)}<Button variant="ghost" class="w-full justify-start" onclick={() => openRouteSurface(gradingTaskHref($page.url, grading.review!.assessment.classGroupId, grading.review!.assessment.id, 'correction'), `${$page.url.pathname}${$page.url.search}`)}>{$t('marks.requestCorrection')}</Button>{/if}
			</RowActionMenu>
		{/if}
		<details class="space-y-3 rounded-xl border border-border p-4">
			<summary class="control-focus cursor-pointer text-sm font-semibold">{$t('gradeInspection.submissionHistory')}</summary>
			{#each grading.review.assessment.marksReview.history.toSorted((a, b) => a.revision - b.revision) as event, index (index)}
				<p class="break-words text-sm">{$t('marks.submitted')} · {$t('gradeInspection.revision', { revision: event.revision })} · {event.subjectId} · {formatLocaleTimestamp(event.at, $locale) ?? $t('dataState.unavailable')}{event.reason ? ` · ${event.reason}` : ''}</p>
			{:else}<p class="text-sm">{$t('gradeInspection.historyUnavailable')}</p>{/each}
		</details>
		<h3 class="text-xl font-semibold">{$t('corrections.title')}</h3>
		{#if !grading.review.corrections.length}<p class="text-sm">{$t('gradeInspection.noCorrections')}</p>{/if}
		{#each grading.review.corrections as correction (correction.id)}
			<div class="space-y-2 rounded-xl bg-secondary p-3">
				<p><strong>{$t(`marks.${correction.status}`)}</strong> · {correction.reason}</p>
				<p>{$t('marks.author')}: {correction.authorSubjectId} · {formatLocaleTimestamp(correction.createdAt, $locale) ?? $t('dataState.unavailable')}</p>
				{#each correction.changes as change (change.resultId)}<p>{name(change.studentId)}: {display(change.before)} → {display(change.proposed)}</p>{/each}
				{#if correction.rejectionReason}<p>{$t('corrections.rejectionReason')}: {correction.rejectionReason}</p>{/if}
				{#if correction.decidedBy || correction.decidedAt}<p class="text-sm">{$t('gradeInspection.decision')}: {correction.decidedBy || $t('dataState.unavailable')} · {correction.decidedAt ? formatLocaleTimestamp(correction.decidedAt, $locale) ?? $t('dataState.unavailable') : $t('dataState.unavailable')}</p>{/if}
				<details class="space-y-3">
					<summary class="control-focus cursor-pointer text-sm font-semibold">{$t('corrections.history')}</summary>
					<p class="text-xs text-muted-foreground">{$t('gradeInspection.revision', { revision: correction.baseRevision })} · {$t('gradeInspection.policyRevision', { revision: correction.baseGradingRevision ?? $t('dataState.unavailable') })}</p>
					{#each correction.revisions.toSorted((a, b) => a.version - b.version) as revision (revision.version)}
						<div class="space-y-2 border-t border-border pt-3 text-sm">
							<p>{$t('gradeInspection.revision', { revision: revision.version })} · {formatLocaleTimestamp(revision.at, $locale) ?? $t('dataState.unavailable')}</p>
							<p class="whitespace-pre-wrap break-words">{revision.reason}</p>
							{#each revision.changes as change (change.resultId)}<p class="break-words">{name(change.studentId)}: {display(change.before)} → {display(change.proposed)}</p>{/each}
						</div>
					{:else}<p class="text-sm">{$t('gradeInspection.historyUnavailable')}</p>{/each}
				</details>
				<div class="flex flex-wrap gap-2">
					{#if correction.allowedActions.approve && hasPermission('GRADE_VALIDATE', { classId: grading.review.assessment.classGroupId })}<Button disabled={Boolean(approving)} aria-busy={approving === correction.id} onclick={() => approveImmediately(correction.id)}>{$t('marks.approve')}</Button>{/if}
					{#if correction.allowedActions.reject && hasPermission('GRADE_VALIDATE', { classId: grading.review.assessment.classGroupId })}<Button variant="outline" onclick={() => {
						reason = '';
						modals.open('reject-correction', { target: correction.id });
					}}>{$t('marks.reject')}</Button>{/if}
					{#if correction.allowedActions.withdraw && pageState.canEnterMarks(grading.review.assessment.id)}<Button variant="outline" onclick={() => modals.open('withdraw-correction', { target: correction.id })}>{$t('marks.withdraw')}</Button>{/if}
				</div>
			</div>
		{/each}
	</section>
{/if}
<FormModal bind:open={submit.open} title={$t('marks.submit')} {busy} submitDisabled={!snapshot?.allowedActions.submit} onSubmit={() => confirm('submit')}><p>{$t('marks.submitHint')}</p></FormModal>
<FormModal bind:open={approve.open} title={$t('marks.approve')} {busy} submitDisabled={!selectedCorrection?.allowedActions.approve} onSubmit={() => confirm('approve')}><p>{$t('marks.approveHint')}</p></FormModal>
<FormModal dirty={Boolean(reason)} bind:open={reject.open} title={$t('marks.reject')} {busy} submitDisabled={!reason.trim() || !selectedCorrection?.allowedActions.reject} onSubmit={() => confirm('reject')}><Textarea bind:value={reason} disabled={busy} required aria-label={$t('marks.reasonRequired')} /></FormModal>
<FormModal bind:open={withdraw.open} title={$t('marks.withdraw')} {busy} submitDisabled={!selectedCorrection?.allowedActions.withdraw} onSubmit={() => confirm('withdraw')}><p>{$t('marks.correctionHint')}</p></FormModal>
