<script lang="ts">
	import type { PlanningEvent, Subject, SubjectCategory } from '$lib/types/school';
	import { createSubjectForClassMutation, updateSubjectMutation } from '$lib/api/mutations/subject.mutations';
	import { createScheduleMutation } from '$lib/api/mutations/schedule.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const PLANNING_DAYS: PlanningEvent['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

	const CATEGORIES: SubjectCategory[] = [
		'Scientifique',
		'Littéraire',
		'Langues',
		'Sciences humaines',
		'Sport',
		'Arts',
	];
	const COLORS: Subject['color'][] = ['mint', 'sky', 'warm'];

	const COLOR_LABELS: Record<Subject['color'], string> = {
		mint: 'Mint',
		sky: 'Sky',
		warm: 'Warm',
	};

	let {
		subject,
		classId,
		weekStart = new Date(),
		open = $bindable(false),
		onCreated,
		disabled = false,
		title,
	}: {
		subject?: Subject;
		classId?: string;
		weekStart?: Date;
		open?: boolean;
		onCreated?: (classSubjectId: string) => void;
		disabled?: boolean;
		title?: string;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let name = $state('');
	let category = $state<SubjectCategory>('Scientifique');
	let color = $state<Subject['color']>('mint');
	let addToTimetable = $state(false);
	let scheduleDay = $state<PlanningEvent['day']>('Mon');
	let scheduleStart = $state('08:00');
	let scheduleEnd = $state('09:00');

	const isEdit = $derived(subject !== undefined);
	const colorLabel = $derived(COLOR_LABELS[color]);
	const canSubmit = $derived(name.trim().length > 0 && (isEdit || (classId?.length ?? 0) > 0));

	function resetForm() {
		if (subject) {
			name = subject.name;
			category = subject.category;
			color = subject.color;
		}
		else {
			name = '';
			category = 'Scientifique';
			color = 'mint';
			addToTimetable = false;
			scheduleDay = 'Mon';
			scheduleStart = '08:00';
			scheduleEnd = '09:00';
		}
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
		if (subject) {
			const ok = await updateSubjectMutation({
				classSubjectId: subject.id,
				name,
				category,
				color,
				successMessage: get(t)('subjects.updateSuccess', { name: name.trim() }),
			});
			busy = false;
			if (ok) {
				open = false;
			}
		}
		else if (classId) {
			const classSubjectId = await createSubjectForClassMutation({
				classGroupId: classId,
				name,
				category,
				color,
				successMessage: get(t)('subjects.createSuccess', { name: name.trim() }),
			});
			busy = false;
			if (classSubjectId) {
				if (addToTimetable) {
					await createScheduleMutation({
						classGroupId: classId,
						scheduleKind: 'lesson',
						title: name.trim(),
						classSubjectId,
						day: scheduleDay,
						startTime: scheduleStart,
						endTime: scheduleEnd,
						weekStart,
					});
				}
				open = false;
				resetForm();
				onCreated?.(classSubjectId);
			}
		}
		else {
			busy = false;
		}
	}
</script>

{#if isEdit}
	<Button
		variant="outline"
		size="sm"
		class="rounded-full"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{$t('common.edit')}
	</Button>
{/if}

<FormModal
	bind:open
	title={isEdit ? $t('subjects.editTitle') : $t('subjects.createTitle')}
	description={isEdit ? subject?.name : $t('subjects.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('subjects.name')}
		</Label>
		<Input bind:value={name} />
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.category')}
			</Label>
			<Select.Root type="single" value={category} onValueChange={v => v && (category = v as SubjectCategory)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('subjects.category')}>
						{category}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each CATEGORIES as cat (cat)}
						<Select.Item value={cat} label={cat}>{cat}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.color')}
			</Label>
			<Select.Root type="single" value={color} onValueChange={v => v && (color = v as Subject['color'])}>
				<Select.Trigger>
					<Select.Value placeholder={$t('subjects.color')}>
						{colorLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each COLORS as c (c)}
						<Select.Item value={c} label={COLOR_LABELS[c]}>{COLOR_LABELS[c]}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
	{#if !isEdit && classId}
		<div class="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
			<label class="flex items-center gap-2 text-sm">
				<Checkbox bind:checked={addToTimetable} />
				{$t('eval.addToTimetable')}
			</label>
			{#if addToTimetable}
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('planning.day')}
					</Label>
					<Select.Root type="single" value={scheduleDay} onValueChange={v => v && (scheduleDay = v as PlanningEvent['day'])}>
						<Select.Trigger>
							<Select.Value placeholder={$t('planning.day')}>
								{$t(`day.full.${scheduleDay}`)}
							</Select.Value>
						</Select.Trigger>
						<Select.Content class="z-[100]">
							{#each PLANNING_DAYS as d (d)}
								<Select.Item value={d} label={$t(`day.full.${d}`)}>{$t(`day.full.${d}`)}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
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
		</div>
	{/if}
</FormModal>
