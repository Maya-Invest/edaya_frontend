<script lang="ts">
	import type { Evaluation, Student } from '$lib/types/school';
	import { recordEvaluationAssessmentResultMutation } from '$lib/api/mutations/evaluation.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const {
		evaluation,
		student,
		existingScore = null,
		disabled = false,
		title,
	}: {
		evaluation: Evaluation;
		student: Student;
		existingScore?: number | null;
		disabled?: boolean;
		title?: string;
	} = $props();

	let open = $state(false);
	let busy = $state(false);
	let score = $state('');

	const numericScore = $derived(Number.parseFloat(score));
	const canSubmit = $derived(
		Number.isFinite(numericScore) && numericScore >= 0 && numericScore <= evaluation.outOf,
	);

	function resetForm() {
		score = existingScore !== null ? String(existingScore) : '';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		const ok = await recordEvaluationAssessmentResultMutation({
			studentId: student.id,
			assessmentId: evaluation.id,
			score: numericScore,
			successMessage: get(t)('eval.gradeSuccess', { name: student.name }),
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}

	const label = $derived(existingScore !== null ? $t('eval.editGrade') : $t('eval.enterGrade'));
</script>

<PermissionGate permission="GRADE_INPUT" mode="disable" tooltip={$t('eval.permissionInput')}>
	{#snippet children({ disabled: gateDisabled, title: gateTitle })}
		<Button
			variant="outline"
			size="sm"
			class="rounded-full"
			disabled={disabled || gateDisabled}
			title={title ?? gateTitle}
			onclick={() => (open = true)}
		>
			{label}
		</Button>
	{/snippet}
</PermissionGate>

<FormModal
	bind:open
	title="{label} · {student.name}"
	description={evaluation.title}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('eval.maxScore')} {evaluation.outOf}
		</Label>
		<Input
			type="number"
			min="0"
			max={evaluation.outOf}
			step="0.25"
			bind:value={score}
		/>
	</div>
</FormModal>
