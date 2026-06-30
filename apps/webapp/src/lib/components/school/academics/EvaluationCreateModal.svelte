<script lang="ts">
	import { createAssessmentMutation } from '$lib/api/mutations/evaluation.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const ASSESSMENT_KINDS = ['quiz', 'homework', 'project', 'other'] as const;

	let {
		classId,
		open = $bindable(false),
		onCreated,
	}: {
		classId: string;
		open?: boolean;
		onCreated?: (assessmentId: string) => void;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let title = $state('');
	let classSubjectId = $state('');
	let maxScore = $state('20');
	let coefficient = $state('1');
	let kind = $state<(typeof ASSESSMENT_KINDS)[number]>('quiz');

	const classSubjects = $derived(
		detailDataContext.subjects.filter(subject => subject.classId === classId),
	);

	const selectedSubjectName = $derived(
		classSubjects.find(subject => subject.id === classSubjectId)?.name ?? '',
	);
	const kindLabel = $derived($t(`eval.kind.${kind}`));

	const numericMax = $derived(Number.parseFloat(maxScore));
	const numericCoef = $derived(Number.parseFloat(coefficient));
	const canSubmit = $derived(
		title.trim().length > 0 && classSubjectId.length > 0 && Number.isFinite(numericMax) && numericMax > 0 && Number.isFinite(numericCoef) && numericCoef > 0,
	);

	function resetForm() {
		title = '';
		classSubjectId = classSubjects[0]?.id ?? '';
		maxScore = '20';
		coefficient = '1';
		kind = 'quiz';
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		const assessmentId = await createAssessmentMutation({
			classGroupId: classId,
			classSubjectId,
			title,
			maxScore: numericMax,
			coefficient: numericCoef,
			kind,
			successMessage: get(t)('eval.createSuccess', { title: title.trim() }),
		});
		busy = false;
		if (assessmentId) {
			open = false;
			resetForm();
			onCreated?.(assessmentId);
		}
	}
</script>

<FormModal
	bind:open
	title={$t('eval.createTitle')}
	description={$t('eval.createDescription')}
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
				{$t('reportCards.subjects')}
			</Label>
			<Select.Root type="single" value={classSubjectId} onValueChange={v => v && (classSubjectId = v)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('reportCards.subjects')}>
						{selectedSubjectName}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each classSubjects as subject (subject.id)}
						<Select.Item value={subject.id} label={subject.name}>{subject.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('eval.newEvaluation')}
			</Label>
			<Input bind:value={title} />
		</div>
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
				<Input type="number" min="0.5" step="0.5" bind:value={coefficient} />
			</div>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('eval.kind')}
			</Label>
			<Select.Root
				type="single"
				value={kind}
				onValueChange={v => v && (kind = v as (typeof ASSESSMENT_KINDS)[number])}
			>
				<Select.Trigger>
					<Select.Value placeholder={$t('eval.kind')}>
						{kindLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each ASSESSMENT_KINDS as k (k)}
						<Select.Item value={k} label={$t(`eval.kind.${k}`)}>{$t(`eval.kind.${k}`)}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	{/if}
</FormModal>
