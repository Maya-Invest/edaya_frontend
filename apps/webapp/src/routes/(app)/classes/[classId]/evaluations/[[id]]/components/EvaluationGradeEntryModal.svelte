<script lang="ts">
	import type { Evaluation, Student } from '$lib/types/school';
	import type { GradeDraft, MarksReview } from '../../lib/grading-task';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';
	import { onDestroy, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getEvaluationsPageState } from '../../evaluations-page.svelte';
	import { gradeDraft, gradeEditable, gradeValues } from '../../lib/grading-task';
	import GradeFields from './GradeFields.svelte';

	let { evaluation, student, existingScore = null, open = $bindable(false) }: {
		evaluation: Evaluation;
		student: Pick<Student, 'id' | 'name' | 'initials'>;
		existingScore?: number | null;
		open?: boolean;
	} = $props();
	const owner = getEvaluationsPageState();
	let busy = $state(false);
	let snapshot = $state<MarksReview | null>(null);
	let draft = $state<GradeDraft>({ score: '', mentionId: '', designation: 'scored' });
	let baseline = $state('');
	let scope = '';
	let session = 0;
	let invalid = $state('');
	const authorized = $derived(owner.canEnterMarks(evaluation.id) && owner.grading?.review && gradeEditable(owner.grading.review, student.id));
	const label = $derived(existingScore !== null || snapshot?.results.some(row => row.studentId === student.id) ? $t('eval.editGrade') : $t('eval.enterGrade'));
	function resetForm() {
		session += 1;
		scope = owner.scope;
		const review = owner.grading?.review;
		snapshot = review?.assessment.id === evaluation.id ? structuredClone($state.snapshot(review)) : null;
		draft = gradeDraft(snapshot?.results.find(row => row.studentId === student.id));
		baseline = JSON.stringify(draft);
		invalid = '';
	}
	let initializedIdentity = '';
	$effect(() => {
		const identity = JSON.stringify([open, evaluation.id, student.id, owner.scope]);
		if (identity === initializedIdentity)
			return;
		initializedIdentity = identity;
		if (open)
			untrack(resetForm);
		else session += 1;
	});
	onDestroy(() => {
		session += 1;
	});
	async function submit() {
		if (busy || !snapshot || !authorized || scope !== owner.scope)
			return;
		if (!gradeValues(draft, snapshot)) {
			invalid = $t('gradeTask.invalid');
			return;
		}
		const capture = session;
		const submitted = structuredClone($state.snapshot(draft));
		busy = true;
		try {
			const outcome = await owner.saveGrade(snapshot, student.id, submitted, { scope, successMessage: get(t)('eval.gradeSuccess', { name: student.name }) });
			if (outcome.saved && capture === session) {
				baseline = JSON.stringify(submitted);
				open = false;
			}
		}
		finally {
			if (capture === session)
				busy = false;
		}
	}
</script>
<FormModal bind:open title="{label} - {student.name}" description={evaluation.title} {busy}
	dirty={JSON.stringify(draft) !== baseline} submitDisabled={!snapshot || !authorized} onCancel={resetForm} onSubmit={submit}>
	{#if snapshot && authorized}<GradeFields bind:draft review={snapshot} disabled={busy} />{:else}<p role="alert">{$t('form.targetUnavailable')}</p>{/if}
	{#if invalid}<p role="alert" class="text-sm text-destructive">{invalid}</p>{/if}
</FormModal>
