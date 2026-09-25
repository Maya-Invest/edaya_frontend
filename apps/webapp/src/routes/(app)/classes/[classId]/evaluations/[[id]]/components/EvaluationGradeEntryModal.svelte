<script lang="ts">
	import type { Evaluation, Student } from '$lib/types/school';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getEvaluationsPageState } from '../../evaluations-page.svelte';

	let {
		evaluation,
		student,
		existingScore = null,
		open = $bindable(false),
	}: {
		evaluation: Evaluation;
		student: Pick<Student, 'id' | 'name' | 'initials'>;
		existingScore?: number | null;
		open?: boolean;
	} = $props();

	const evaluationsPage = getEvaluationsPageState();
	let busy = $state(false);
	let score = $state('');
	let designation = $state<'scored' | 'absent' | 'exempt'>('scored');

	const numericScore = $derived(Number.parseFloat(score));
	const canSubmit = $derived(
		evaluationsPage.grading?.review?.assessment.marksStatus === 'draft' && (designation !== 'scored' || (score.trim() !== '' && Number.isFinite(numericScore) && numericScore >= 0 && numericScore <= evaluation.outOf)),
	);
	const label = $derived(existingScore !== null ? $t('eval.editGrade') : $t('eval.enterGrade'));

	function resetForm() {
		score = existingScore !== null ? String(existingScore) : '';
		designation = 'scored';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		const ok = await evaluationsPage.recordGrade({
			studentId: student.id,
			assessmentId: evaluation.id,
			score: designation === 'scored' ? numericScore : null,
			designation,
			successMessage: get(t)('eval.gradeSuccess', { name: student.name }),
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

<FormModal
	bind:open
	title="{label} - {student.name}"
	description={evaluation.title}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<Label for="mark-designation">{$t('marks.designation')}</Label>
	<select id="mark-designation" bind:value={designation} class="rounded-md border bg-background p-2 text-sm">
		<option value="scored">{$t('marks.scored')}</option>
		<option value="absent">{$t('marks.absent')}</option>
		<option value="exempt">{$t('marks.exempt')}</option>
	</select>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('eval.maxScore')} {evaluation.outOf}
		</Label>
		<Input
			type="number"
			min="0"
			max={evaluation.outOf}
			step="0.01"
			disabled={designation !== 'scored'}
			bind:value={score}
		/>
	</div>
</FormModal>
