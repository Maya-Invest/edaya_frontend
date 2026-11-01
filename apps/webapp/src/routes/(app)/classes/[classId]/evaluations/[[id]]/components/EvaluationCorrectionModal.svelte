<script lang="ts">
	import type { GradeDraft, MarksReview } from '../../lib/grading-task';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { onDestroy, untrack } from 'svelte';
	import { getEvaluationsPageState } from '../../evaluations-page.svelte';
	import { gradeCorrectable, gradeDraft, gradeValues } from '../../lib/grading-task';
	import GradeFields from './GradeFields.svelte';
	import GradeResultValue from './GradeResultValue.svelte';

	let { resultId, open = $bindable(false) }: { resultId: string; open?: boolean } = $props();
	const owner = getEvaluationsPageState();
	let snapshot = $state<MarksReview | null>(null);
	let draft = $state<GradeDraft>({ score: '', mentionId: '', designation: 'scored' });
	let notes = $state('');
	let reason = $state('');
	let baseline = $state('');
	let busy = $state(false);
	let invalid = $state('');
	let scope = '';
	let session = 0;
	let initializedIdentity = '';
	const result = $derived(snapshot?.results.find(row => row.id === resultId));
	const student = $derived(snapshot?.students.find(row => row.id === result?.studentId));
	const authorized = $derived(Boolean(snapshot && gradeCorrectable(snapshot, resultId)
		&& owner.canEnterMarks(snapshot.assessment.id) && owner.grading?.review
		&& owner.grading.review.assessment.id === snapshot.assessment.id && gradeCorrectable(owner.grading.review, resultId)));
	const edited = $derived(JSON.stringify({ draft, notes }) !== baseline);
	function reset() {
		session += 1;
		busy = false;
		scope = owner.scope;
		const review = owner.grading?.review;
		snapshot = review && owner.selectedId === review.assessment.id ? structuredClone($state.snapshot(review)) : null;
		const mark = snapshot?.results.find(row => row.id === resultId);
		draft = gradeDraft(mark);
		notes = mark?.notes ?? '';
		reason = '';
		baseline = JSON.stringify({ draft, notes });
		invalid = '';
	}
	$effect(() => {
		const identity = JSON.stringify([open, resultId, owner.scope, owner.selectedId]);
		if (identity === initializedIdentity)
			return;
		initializedIdentity = identity;
		if (open)
			untrack(reset);
		else session += 1;
	});
	onDestroy(() => {
		session += 1;
	});
	async function submit() {
		if (busy || !snapshot || !result || !authorized || !edited || !reason.trim() || scope !== owner.scope)
			return;
		const values = gradeValues(draft, snapshot);
		if (!values) {
			invalid = $t('gradeTask.invalid');
			return;
		}
		const capture = session;
		const submittedBaseline = JSON.stringify({ draft, notes });
		busy = true;
		try {
			const saved = await owner.reviewMarks('request', { snapshot, scope, reason: reason.trim(), changes: [{ resultId: result.id, proposed: { ...values, notes: notes === (result.notes ?? '') ? result.notes ?? null : notes.trim() || null } }] });
			if (saved && capture === session) {
				baseline = submittedBaseline;
				reason = '';
				open = false;
			}
		}
		finally {
			if (capture === session)
				busy = false;
		}
	}
</script>

<FormModal bind:open title={$t('gradeInspection.correct')} description={student ? `${student.firstName} ${student.lastName}` : undefined}
	{busy} dirty={edited || Boolean(reason)} submitDisabled={!authorized || !edited || !reason.trim()}
	submitLabel={$t('marks.requestCorrection')} onSubmit={submit} onCancel={reset}>
	{#if snapshot && result && authorized}
		<section class="space-y-2"><h3 class="text-sm font-semibold">{$t('corrections.official')}</h3><GradeResultValue {result} mode="original" /><p class="whitespace-pre-wrap break-words text-sm">{result.notes || $t('value.notProvided')}</p></section>
		<section class="space-y-4"><h3 class="text-sm font-semibold">{$t('corrections.proposed')}</h3><GradeFields bind:draft review={snapshot} disabled={busy} />
			<label class="block space-y-2 text-sm"><span>{$t('gradeInspection.comment')}</span><Textarea bind:value={notes} disabled={busy} /></label>
		</section>
		<label class="block space-y-2 text-sm"><span>{$t('marks.reasonRequired')}</span><Textarea bind:value={reason} disabled={busy} required /></label>
		<p class="text-sm">{$t('marks.correctionHint')}</p>
	{:else}<p role="alert">{snapshot && !owner.canEnterMarks(snapshot.assessment.id) ? $t('gradeTask.denied') : result ? $t('gradeInspection.correctionBlocked') : $t('form.targetUnavailable')}</p>{/if}
	{#if invalid}<p role="alert" class="text-sm text-destructive">{invalid}</p>{/if}
</FormModal>
