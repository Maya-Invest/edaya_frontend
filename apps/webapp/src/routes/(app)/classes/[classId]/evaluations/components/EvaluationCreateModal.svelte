<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { todayDateInput } from '$lib/date/format';
	import { lang, t } from '$lib/i18n';
	import { catalogSubjectName } from '$lib/i18n/catalog-label';
	import { get } from 'svelte/store';
	import { getEvaluationsPageState } from '../evaluations-page.svelte';

	const ASSESSMENT_KINDS = ['quiz', 'homework', 'project', 'other'] as const;

	let {
		classId,
		evaluation = null,
		open = $bindable(false),
		onCreated,
	}: {
		classId: string;
		evaluation?: Evaluation | null;
		open?: boolean;
		onCreated?: (assessmentId: string) => void;
	} = $props();

	const evaluationsPage = getEvaluationsPageState();
	let busy = $state(false);
	let wasOpen = $state(false);
	let title = $state('');
	let description = $state('');
	let classSubjectId = $state('');
	let maxScore = $state('20');
	let coefficient = $state('1');
	let kind = $state<(typeof ASSESSMENT_KINDS)[number]>('quiz');
	let dueDate = $state('');

	const isEdit = $derived(evaluation !== null);
	const isHomework = $derived(kind === 'homework');
	const classSubjects = $derived(evaluationsPage.subjectsFor(classId));
	const selectedSubjectName = $derived.by(() => {
		const subject = classSubjects.find(entry => entry.id === classSubjectId);
		return subject ? catalogSubjectName(subject.name, $lang, subject.code) : '';
	});
	const kindLabel = $derived($t(`eval.kind.${kind}`));
	const numericMax = $derived(Number.parseFloat(maxScore));
	const numericCoef = $derived(Number.parseFloat(coefficient));
	const canSubmit = $derived.by(() => {
		if (title.trim().length === 0 || classSubjectId.length === 0) {
			return false;
		}
		if (!Number.isFinite(numericMax) || numericMax <= 0) {
			return false;
		}
		if (!Number.isFinite(numericCoef) || numericCoef <= 0) {
			return false;
		}
		return !isHomework || dueDate.length > 0;
	});

	function resetForm() {
		if (evaluation) {
			title = evaluation.title;
			description = evaluation.description ?? '';
			classSubjectId = evaluation.classSubjectId;
			maxScore = String(evaluation.outOf);
			coefficient = String(evaluation.coefficient);
			kind = evaluation.kind;
			dueDate = evaluation.dueDate ?? evaluation.date;
			return;
		}

		title = '';
		description = '';
		classSubjectId = classSubjects[0]?.id ?? '';
		maxScore = '20';
		coefficient = '1';
		kind = 'quiz';
		dueDate = todayDateInput();
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	$effect(() => {
		if (open && !classSubjectId && classSubjects[0]) {
			classSubjectId = classSubjects[0].id;
		}
	});

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		try {
			if (evaluation) {
				const ok = await evaluationsPage.updateEvaluation({
					assessmentId: evaluation.id,
					classSubjectId,
					title,
					description,
					dueDate: isHomework ? dueDate : undefined,
					maxScore: numericMax,
					coefficient: numericCoef,
					kind,
					successMessage: get(t)('eval.updateSuccess', { title: title.trim() }),
				});
				if (ok) {
					open = false;
				}
				return;
			}

			const assessmentId = await evaluationsPage.createEvaluation({
				classGroupId: classId,
				classSubjectId,
				title,
				description,
				maxScore: numericMax,
				coefficient: numericCoef,
				kind,
				dueAt: isHomework ? dueDate : undefined,
				successMessage: get(t)('eval.createSuccess', { title: title.trim() }),
			});

			if (assessmentId) {
				open = false;
				resetForm();
				onCreated?.(assessmentId);
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={isEdit ? $t('eval.editTitle') : $t('eval.createTitle')}
	description={isEdit ? evaluation?.title : $t('eval.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	{#if classSubjects.length === 0}
		<p class="rounded-xl bg-secondary/40 p-3 text-sm text-muted-foreground">
			{$t('dataState.emptyDescription')}
		</p>
	{:else}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('eval.kind')}
			</Label>
			<Select.Root
				type="single"
				value={kind}
				onValueChange={value => value && (kind = value as (typeof ASSESSMENT_KINDS)[number])}
			>
				<Select.Trigger>
					<Select.Value placeholder={$t('eval.kind')}>
						{kindLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each ASSESSMENT_KINDS as entry (entry)}
						<Select.Item value={entry} label={$t(`eval.kind.${entry}`)}>{$t(`eval.kind.${entry}`)}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('reportCards.subjects')}
			</Label>
			<Select.Root type="single" value={classSubjectId} onValueChange={value => value && (classSubjectId = value)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('reportCards.subjects')}>
						{selectedSubjectName || $t('reportCards.subjects')}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each classSubjects as subject (subject.id)}
						<Select.Item value={subject.id} label={catalogSubjectName(subject.name, $lang, subject.code)}>
							{catalogSubjectName(subject.name, $lang, subject.code)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('hw.titleField')}
			</Label>
			<Input bind:value={title} />
		</div>

		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('hw.descriptionField')}
			</Label>
			<Textarea bind:value={description} rows={3} />
		</div>

		{#if isHomework}
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('hw.due')}
				</Label>
				<Input type="date" bind:value={dueDate} />
			</div>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('eval.maxScore')}
					</Label>
					<Input type="number" min="1" step="1" bind:value={maxScore} />
				</div>
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('eval.coefficient')}
					</Label>
					<Input type="number" min="0.25" step="0.25" bind:value={coefficient} />
				</div>
			</div>
		{/if}
	{/if}
</FormModal>
