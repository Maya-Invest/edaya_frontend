<script lang="ts">
	import type { components } from '$lib/api/schema';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { getEvaluationsPageState } from '../../../../evaluations-page.svelte';
	import { getEvaluationGradingTabState } from '../evaluation-grading-tab.svelte';

	const pageState = getEvaluationsPageState();
	const grading = getEvaluationGradingTabState();
	const modals = createUrlSyncedModals({ allowed: ['edit', 'delete', 'submit-marks', 'request-correction', 'approve-correction', 'reject-correction', 'withdraw-correction'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const submit = bindUrlModal(modals, 'submit-marks');
	const request = bindUrlModal(modals, 'request-correction');
	const approve = bindUrlModal(modals, 'approve-correction');
	const reject = bindUrlModal(modals, 'reject-correction');
	const withdraw = bindUrlModal(modals, 'withdraw-correction');
	type Values = components['schemas']['RequestAssessmentMarksCorrectionCommand']['changes'][number]['proposed'];
	let drafts = $state<Record<string, { selected: boolean; score: string; mentionId: string; designation: Values['designation']; notes: string }>>({});
	let reason = $state('');
	let busy = $state(false);
	const selectedCorrection = $derived(grading.review?.corrections.find(row => row.id === modals.target));
	const rows = $derived(grading.review?.results.filter(row => !grading.review?.publishedResultIds.includes(row.id)) ?? []);
	const mentionFirst = $derived(grading.review?.gradingPolicy?.mode === 'mention-first');
	const mentions = $derived(grading.review?.gradingPolicy?.scale.ranges ?? []);
	const mentionOptions = $derived([{ value: '', label: $t('grading.mention') }, ...mentions.map(row => ({ value: row.id ?? '', label: `${row.letter} · ${row.interpretation ?? ''}` }))]);
	const changes = $derived(rows.filter(row => drafts[row.id]?.selected).map(row => ({ resultId: row.id, proposed: { mentionId: mentionFirst && drafts[row.id].designation === 'scored' ? drafts[row.id].mentionId : null, score: !mentionFirst && drafts[row.id].designation === 'scored' ? Number(drafts[row.id].score) : null, designation: drafts[row.id].designation, notes: drafts[row.id].notes.trim() || null } })));
	const valid = $derived(reason.trim().length > 0 && changes.length > 0 && changes.every(change => change.proposed.designation !== 'scored' || (mentionFirst ? !!change.proposed.mentionId : (drafts[change.resultId].score.trim() !== '' && Number.isFinite(change.proposed.score) && change.proposed.score! >= 0 && change.proposed.score! <= (grading.review?.assessment.maxScore ?? 0)))));
	function name(studentId: string) {
		const student = grading.review?.students.find(row => row.id === studentId);
		return student ? `${student.firstName} ${student.lastName}` : studentId;
	}
	function display(value: { mentionId?: string | null; score?: number | null; designation?: string; notes?: string | null }) {
		return `${value.designation === 'absent' || value.designation === 'exempt' ? $t(`marks.${value.designation}`) : value.mentionId ? mentions.find(row => row.id === value.mentionId)?.letter ?? value.mentionId : (grading.review?.gradingPolicy ? value.score?.toString() : value.score?.toFixed(2)) ?? '—'}${value.notes ? ` · ${value.notes}` : ''}`;
	}
	$effect(() => {
		if (request.open) {
			for (const row of rows) {
				if (!drafts[row.id])
					drafts[row.id] = { selected: false, score: String(row.score ?? ''), mentionId: row.mentionId ?? '', designation: row.designation ?? 'scored', notes: row.notes ?? '' };
			}
		}
	});
	async function confirm(action: 'submit' | 'request' | 'approve' | 'reject' | 'withdraw') {
		busy = true;
		try {
			if (await pageState.reviewMarks(action, { reason, changes, correctionId: selectedCorrection?.id })) {
				modals.close();
				drafts = {};
				reason = '';
			}
		}
		finally { busy = false; }
	}
</script>
{#if grading.review}
	<section class="space-y-3 p-4">
		<p>{$t('marks.status', { state: $t(`marks.${grading.review.assessment.marksStatus}`), revision: String(grading.review.assessment.marksRevision) })}</p>
		{#if grading.review.assessment.marksStatus === 'draft'}<p>{$t('marks.incomplete', { count: String(grading.review.missingStudentIds.length) })}</p>{/if}
		{#if grading.review.publishedResultIds.length}<p>{$t('marks.publishedLocked', { count: String(grading.review.publishedResultIds.length) })}</p>{/if}
		<div class="flex flex-wrap gap-2">
			{#if grading.review.allowedActions.submit}<Button onclick={() => submit.open = true}>{$t('marks.submit')}</Button>{/if}
			{#if grading.review.allowedActions.requestCorrection}<Button onclick={() => request.open = true}>{$t('marks.requestCorrection')}</Button>{/if}
		</div>
		{#each grading.review.corrections as correction (correction.id)}
			<div class="space-y-2 rounded-xl bg-secondary p-3">
				<p><strong>{$t(`marks.${correction.status}`)}</strong> · {correction.reason}</p>
				<p>{$t('marks.author')}: {correction.authorSubjectId} · {new Date(correction.createdAt).toLocaleString()}</p>
				{#each correction.changes as change (change.resultId)}<p>{name(change.studentId)}: {display(change.before)} → {display(change.proposed)}</p>{/each}
				{#if correction.rejectionReason}<p>{correction.rejectionReason}</p>{/if}
				<div class="flex flex-wrap gap-2">
					{#if correction.allowedActions.approve}<Button onclick={() => modals.open('approve-correction', { target: correction.id })}>{$t('marks.approve')}</Button>{/if}
					{#if correction.allowedActions.reject}<Button variant="outline" onclick={() => {
						reason = '';
						modals.open('reject-correction', { target: correction.id });
					}}>{$t('marks.reject')}</Button>{/if}
					{#if correction.allowedActions.withdraw}<Button variant="outline" onclick={() => modals.open('withdraw-correction', { target: correction.id })}>{$t('marks.withdraw')}</Button>{/if}
				</div>
			</div>
		{/each}
	</section>
{/if}
<FormModal bind:open={submit.open} title={$t('marks.submit')} {busy} onSubmit={() => confirm('submit')}><p>{$t('marks.submitHint')}</p></FormModal>
<FormModal bind:open={request.open} title={$t('marks.requestCorrection')} {busy} submitDisabled={!valid} onSubmit={() => confirm('request')}>
	<div class="space-y-4">
		<p>{$t('marks.correctionHint')}</p>
		{#each rows as row (row.id)}
			{#if drafts[row.id]}
				<fieldset class="space-y-2 rounded-xl bg-secondary p-3">
					<label class="flex gap-2"><input type="checkbox" bind:checked={drafts[row.id].selected} /> {name(row.studentId)} · {display(row)}</label>
					{#if drafts[row.id].selected}
						<label>{$t('marks.designation')}<select class="w-full rounded-md border p-2" bind:value={drafts[row.id].designation}>{#each ['scored', 'absent', 'exempt'] as designation (designation)}<option value={designation}>{$t(`marks.${designation}`)}</option>{/each}</select></label>
						{#if drafts[row.id].designation === 'scored' && mentionFirst}<FilterSelect bind:value={drafts[row.id].mentionId} options={mentionOptions} aria-label={$t('grading.mention')} />{:else if drafts[row.id].designation === 'scored'}<label>{$t('marks.scored')}<input class="w-full rounded-md border p-2" type="text" inputmode="decimal" bind:value={drafts[row.id].score} /></label>{/if}
						<label>{$t('marks.comment')}<Textarea bind:value={drafts[row.id].notes} /></label>
					{/if}
				</fieldset>
			{/if}
		{/each}
		<label>{$t('marks.reasonRequired')}<Textarea bind:value={reason} required /></label>
		{#each changes as change (change.resultId)}<p>{name(rows.find(row => row.id === change.resultId)!.studentId)}: {display(rows.find(row => row.id === change.resultId)!)} → {display(change.proposed)}</p>{/each}
	</div>
</FormModal>
<FormModal bind:open={approve.open} title={$t('marks.approve')} {busy} submitDisabled={!selectedCorrection?.allowedActions.approve} onSubmit={() => confirm('approve')}><p>{$t('marks.approveHint')}</p></FormModal>
<FormModal bind:open={reject.open} title={$t('marks.reject')} {busy} submitDisabled={!reason.trim() || !selectedCorrection?.allowedActions.reject} onSubmit={() => confirm('reject')}><Textarea bind:value={reason} required aria-label={$t('marks.reasonRequired')} /></FormModal>
<FormModal bind:open={withdraw.open} title={$t('marks.withdraw')} {busy} submitDisabled={!selectedCorrection?.allowedActions.withdraw} onSubmit={() => confirm('withdraw')}><p>{$t('marks.correctionHint')}</p></FormModal>
