<script lang="ts">
	import type { Student } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { Plus } from '$lib/icons';
	import { getStudentGradesTabState } from '../student-grades-tab.svelte';

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

	const gradesTab = getStudentGradesTabState();
	let busy = $state(false);
	let wasOpen = $state(false);
	let assessmentId = $state('');
	let score = $state('');

	const evaluations = $derived(gradesTab.evaluationsForClass(s.classId));
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
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	function resetForm() {
		assessmentId = evaluations[0]?.id ?? '';
		score = '';
	}

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		const ok = await gradesTab.recordGrade({
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
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	{#if evaluations.length === 0}
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
