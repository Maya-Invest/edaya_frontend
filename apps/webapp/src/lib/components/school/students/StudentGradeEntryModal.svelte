<script lang="ts">
	import type { Evaluation, Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { loadClassEvaluations } from '$lib/api/assessments-data';
	import { recordStudentAssessmentResultMutation } from '$lib/api/mutations/student.mutations';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { Plus } from '$lib/icons';

	let {
		s,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
	}: {
		s: Student;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
	} = $props();
	let busy = $state(false);
	let wasOpen = $state(false);
	let loadingEvaluations = $state(false);
	let evaluations = $state<Evaluation[]>([]);
	let assessmentId = $state('');
	let score = $state('');

	const selectedEvaluation = $derived(evaluations.find(evaluation => evaluation.id === assessmentId));
	const assessmentLabel = $derived(
		selectedEvaluation
			? `${selectedEvaluation.title} · ${selectedEvaluation.subject}`
			: '',
	);
	const numericScore = $derived(Number.parseFloat(score));
	const canSubmit = $derived.by(() => {
		if (!assessmentId || !Number.isFinite(numericScore) || numericScore < 0) {
			return false;
		}
		return !selectedEvaluation || numericScore <= selectedEvaluation.outOf;
	});

	$effect(() => {
		if (open && !wasOpen) {
			void loadEvaluations().then(() => resetForm());
		}
		wasOpen = open;
	});

	async function loadEvaluations() {
		const periodId = academicContext.periodId;
		if (!periodId || !s.classId) {
			evaluations = [];
			return;
		}

		loadingEvaluations = true;
		try {
			const rows = await loadClassEvaluations(getBrowserSchoolClient(), s.classId, periodId);
			evaluations = rows.sort((left, right) => right.date.localeCompare(left.date));
		}
		catch {
			evaluations = [];
		}
		finally {
			loadingEvaluations = false;
		}
	}

	function resetForm() {
		assessmentId = evaluations[0]?.id ?? '';
		score = '';
	}

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		const ok = await recordStudentAssessmentResultMutation({
			studentId: s.id,
			assessmentId,
			score: numericScore,
			successMessage: `Note enregistrée pour ${s.name}.`,
		});
		busy = false;
		if (ok) {
			open = false;
			resetForm();
		}
	}
</script>

{#if showTrigger}
	<Button
		variant="ghost"
		class="w-full rounded-full border border-dashed border-border"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		<Plus class="mr-1 h-4 w-4" /> Saisir une note
	</Button>
{/if}

<FormModal
	bind:open
	title={`Saisir une note pour ${s.name}`}
	description="Choisissez une évaluation existante de la classe."
	submitLabel="Enregistrer"
	busy={busy || loadingEvaluations}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	{#if loadingEvaluations}
		<p class="rounded-xl bg-secondary/40 p-3 text-sm text-muted-foreground">
			Chargement des évaluations…
		</p>
	{:else if evaluations.length === 0}
		<p class="rounded-xl bg-secondary/40 p-3 text-sm text-muted-foreground">
			Aucune évaluation disponible pour cette classe.
		</p>
	{:else}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Évaluation</Label>
			<Select.Root type="single" value={assessmentId} onValueChange={v => v && (assessmentId = v)}>
				<Select.Trigger>
					<Select.Value placeholder="Évaluation">
						{assessmentLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each evaluations as evaluation (evaluation.id)}
						<Select.Item value={evaluation.id} label={evaluation.title}>
							{evaluation.title}
							<span class="ml-1 text-muted-foreground">· {evaluation.subject}</span>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				Note {#if selectedEvaluation}/ {selectedEvaluation.outOf}{/if}
			</Label>
			<Input type="number" min="0" max={selectedEvaluation?.outOf} step="0.25" bind:value={score} />
		</div>
	{/if}
</FormModal>
