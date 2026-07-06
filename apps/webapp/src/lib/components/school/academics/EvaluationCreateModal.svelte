<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import { createAssessmentMutation, updateAssessmentMutation } from '$lib/api/mutations/evaluation.mutations';
	import { createScheduleMutation } from '$lib/api/mutations/schedule.mutations';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const ASSESSMENT_KINDS = ['quiz', 'homework', 'project', 'other'] as const;
	const PLANNING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

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

	let busy = $state(false);
	let wasOpen = $state(false);
	let title = $state('');
	let description = $state('');
	let classSubjectId = $state('');
	let maxScore = $state('20');
	let coefficient = $state('1');
	let kind = $state<(typeof ASSESSMENT_KINDS)[number]>('quiz');
	let dueDate = $state('');
	let assignedDate = $state('');
	let addToTimetable = $state(false);
	let scheduleDay = $state<(typeof PLANNING_DAYS)[number]>('Mon');
	let scheduleStart = $state('09:00');
	let scheduleEnd = $state('10:00');

	const isEdit = $derived(evaluation !== null);
	const isHomework = $derived(kind === 'homework');

	const classSubjects = $derived(
		detailDataContext.subjectsForClass(classId),
	);

	const selectedSubjectName = $derived(
		classSubjects.find(subject => subject.id === classSubjectId)?.name ?? '',
	);
	const kindLabel = $derived($t(`eval.kind.${kind}`));

	const numericMax = $derived(Number.parseFloat(maxScore));
	const numericCoef = $derived(Number.parseFloat(coefficient));
	const canSubmit = $derived(
		title.trim().length > 0
		&& classSubjectId.length > 0
			&& Number.isFinite(numericMax)
		&& numericMax > 0
			&& Number.isFinite(numericCoef)
		&& numericCoef > 0
			&& (!isHomework || (dueDate.length > 0 && assignedDate.length > 0)),
	);

	function resetForm() {
		if (evaluation) {
			title = evaluation.title;
			description = evaluation.description ?? '';
			classSubjectId = evaluation.classSubjectId;
			maxScore = String(evaluation.outOf);
			coefficient = String(evaluation.coefficient);
			kind = evaluation.kind;
			dueDate = evaluation.dueDate ?? evaluation.date;
			assignedDate = evaluation.assignedDate ?? evaluation.date;
			addToTimetable = false;
			return;
		}

		title = '';
		description = '';
		classSubjectId = classSubjects[0]?.id ?? '';
		maxScore = '20';
		coefficient = '1';
		kind = 'quiz';
		dueDate = new Date().toISOString().slice(0, 10);
		assignedDate = new Date().toISOString().slice(0, 10);
		addToTimetable = false;
		scheduleDay = 'Mon';
		scheduleStart = '09:00';
		scheduleEnd = '10:00';
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
				const ok = await updateAssessmentMutation({
					assessmentId: evaluation.id,
					title,
					description,
					dueDate: isHomework ? dueDate : undefined,
					assignedDate: isHomework ? assignedDate : undefined,
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

			const assessmentId = await createAssessmentMutation({
				classGroupId: classId,
				classSubjectId,
				title,
				description,
				maxScore: numericMax,
				coefficient: numericCoef,
				kind,
				dueAt: isHomework ? dueDate : undefined,
				assignedDate: isHomework ? assignedDate : undefined,
				successMessage: get(t)('eval.createSuccess', { title: title.trim() }),
			});

			if (assessmentId && addToTimetable && !isHomework) {
				await createScheduleMutation({
					classGroupId: classId,
					scheduleKind: 'lesson',
					title: title.trim(),
					classSubjectId,
					day: scheduleDay,
					startTime: scheduleStart,
					endTime: scheduleEnd,
					weekStart: new Date(),
				});
			}

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
				onValueChange={v => v && (kind = v as (typeof ASSESSMENT_KINDS)[number])}
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
			<Select.Root type="single" value={classSubjectId} onValueChange={v => v && (classSubjectId = v)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('reportCards.subjects')}>
						{selectedSubjectName || $t('reportCards.subjects')}
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

		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('hw.descriptionField')}
			</Label>
			<Textarea bind:value={description} rows={3} />
		</div>

		{#if isHomework}
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('drawer.assigned')}
					</Label>
					<Input type="date" bind:value={assignedDate} />
				</div>
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('hw.due')}
					</Label>
					<Input type="date" bind:value={dueDate} />
				</div>
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
					<Input type="number" min="0.5" step="0.5" bind:value={coefficient} />
				</div>
			</div>

			{#if !isEdit}
				<label class="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm">
					<Checkbox
						checked={addToTimetable}
						onCheckedChange={(checked) => {
							if (typeof checked === 'boolean') {
								addToTimetable = checked;
							}
						}}
					/>
					<span>{$t('eval.addToTimetable')}</span>
				</label>

				{#if addToTimetable}
					<div class="grid gap-3 sm:grid-cols-3">
						<div class="space-y-1.5">
							<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
								{$t('planning.day')}
							</Label>
							<Select.Root
								type="single"
								value={scheduleDay}
								onValueChange={v => v && (scheduleDay = v as (typeof PLANNING_DAYS)[number])}
							>
								<Select.Trigger>
									<Select.Value placeholder={$t('planning.day')}>
										{$t(`day.full.${scheduleDay}`)}
									</Select.Value>
								</Select.Trigger>
								<Select.Content class="z-[100]">
									{#each PLANNING_DAYS as day (day)}
										<Select.Item value={day} label={$t(`day.full.${day}`)}>
											{$t(`day.full.${day}`)}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
						<div class="space-y-1.5">
							<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
								{$t('drawer.start')}
							</Label>
							<Input type="time" bind:value={scheduleStart} />
						</div>
						<div class="space-y-1.5">
							<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
								{$t('drawer.end')}
							</Label>
							<Input type="time" bind:value={scheduleEnd} />
						</div>
					</div>
				{/if}
			{/if}
		{/if}
	{/if}
</FormModal>
