<script lang="ts">
	import type { PlanningEvent, TimetableSchedule } from '$lib/types/school';
	import { createScheduleMutation, updateScheduleMutation } from '$lib/api/mutations/schedule.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const DAYS: PlanningEvent['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

	let {
		classId,
		weekStart,
		schedule,
		open = $bindable(false),
		disabled = false,
		title,
		hideTrigger = false,
	}: {
		classId: string;
		weekStart: Date;
		schedule?: TimetableSchedule;
		open?: boolean;
		disabled?: boolean;
		title?: string;
		hideTrigger?: boolean;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let scheduleTitle = $state('');
	let classSubjectId = $state('');
	let day = $state<PlanningEvent['day']>('Mon');
	let startTime = $state('08:00');
	let endTime = $state('09:00');

	const isEdit = $derived(schedule !== undefined);
	const classSubjects = $derived(
		detailDataContext.subjects.filter(subject => subject.classId === classId),
	);
	const selectedSubjectName = $derived(
		classSubjects.find(subject => subject.id === classSubjectId)?.name ?? '',
	);
	const canSubmit = $derived(
		scheduleTitle.trim().length > 0 && startTime.length > 0 && endTime.length > 0 && startTime < endTime,
	);

	function resetForm() {
		if (schedule) {
			scheduleTitle = schedule.title;
			day = schedule.day;
			startTime = schedule.startTime;
			endTime = schedule.endTime;
			const match = classSubjects.find(subject => subject.id === schedule.classSubjectId);
			classSubjectId = match?.id ?? classSubjects[0]?.id ?? '';
		}
		else {
			scheduleTitle = '';
			day = 'Mon';
			startTime = '08:00';
			endTime = '09:00';
			classSubjectId = classSubjects[0]?.id ?? '';
		}
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		if (schedule) {
			const ok = await updateScheduleMutation({
				scheduleId: schedule.id,
				classGroupId: classId,
				weekStart,
				title: scheduleTitle,
				classSubjectId: classSubjectId || null,
				day,
				startTime,
				endTime,
				successMessage: get(t)('planning.schedule.updateSuccess', { title: scheduleTitle.trim() }),
			});
			busy = false;
			if (ok) {
				open = false;
			}
		}
		else {
			const scheduleId = await createScheduleMutation({
				classGroupId: classId,
				weekStart,
				title: scheduleTitle,
				classSubjectId: classSubjectId || undefined,
				day,
				startTime,
				endTime,
				successMessage: get(t)('planning.schedule.createSuccess', { title: scheduleTitle.trim() }),
			});
			busy = false;
			if (scheduleId) {
				open = false;
				resetForm();
			}
		}
	}
</script>

{#if isEdit && !hideTrigger}
	<Button
		variant="outline"
		size="sm"
		class="h-7 rounded-full text-xs"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{$t('common.edit')}
	</Button>
{/if}

<FormModal
	bind:open
	title={isEdit ? $t('planning.schedule.editTitle') : $t('planning.schedule.createTitle')}
	description={isEdit ? schedule?.title : $t('planning.schedule.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.title')}
		</Label>
		<Input bind:value={scheduleTitle} />
	</div>
	{#if classSubjects.length > 0}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('drawer.subject')}
			</Label>
			<Select.Root type="single" value={classSubjectId} onValueChange={v => v && (classSubjectId = v)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('drawer.subject')}>
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
	{/if}
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('planning.day')}
		</Label>
		<Select.Root type="single" value={day} onValueChange={v => v && (day = v as PlanningEvent['day'])}>
			<Select.Trigger>
				<Select.Value placeholder={$t('planning.day')}>
					{$t(`day.full.${day}`)}
				</Select.Value>
			</Select.Trigger>
			<Select.Content class="z-[100]">
				{#each DAYS as d (d)}
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
			<Input type="time" bind:value={startTime} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('drawer.end')}
			</Label>
			<Input type="time" bind:value={endTime} />
		</div>
	</div>
</FormModal>
