<script lang="ts">
	import type { Activity, PlanningEvent, Subject, TimetableSchedule, TimetableScheduleKind } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { lang, t } from '$lib/i18n';
	import { catalogSubjectName } from '$lib/i18n/catalog-label';
	import { get } from 'svelte/store';
	import { getPlanningTimetableState } from '../planning-timetable-state.svelte';

	const actionState = getPlanningTimetableState();
	const DAYS: PlanningEvent['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const SCHEDULE_KINDS: TimetableScheduleKind[] = ['lesson', 'activity'];
	let { classId, weekStart, schedule, defaultScheduleKind = 'lesson', open = $bindable(false), disabled = false, title, hideTrigger = false, onSaved, subjects, activities }: {
		classId: string;
		weekStart: Date;
		schedule?: TimetableSchedule;
		defaultScheduleKind?: TimetableScheduleKind;
		open?: boolean;
		disabled?: boolean;
		title?: string;
		hideTrigger?: boolean;
		onSaved?: () => Promise<void>;
		subjects: Subject[];
		activities: Activity[];
	} = $props();
	let busy = $state(false);
	let isRecurring = $state(true);
	let specificDate = $state('');
	let wasOpen = $state(false);
	let scheduleTitle = $state('');
	let scheduleKind = $state<TimetableScheduleKind>('lesson');
	let classSubjectId = $state('');
	let activityId = $state('');
	let day = $state<PlanningEvent['day']>('Mon');
	let startTime = $state('08:00');
	let endTime = $state('09:00');
	const isEdit = $derived(schedule !== undefined);
	const classSubjects = $derived(subjects.filter(subject => subject.classId === classId));
	const activityOptions = $derived(activities);
	const selectedSubjectName = $derived.by(() => {
		const subject = classSubjects.find(entry => entry.id === classSubjectId);
		return subject ? catalogSubjectName(subject.name, $lang, subject.shortName) : '';
	});
	const selectedActivityName = $derived(activityOptions.find(activity => activity.id === activityId)?.name ?? '');
	const canSubmit = $derived.by(() => {
		return (isRecurring || Boolean(specificDate)) && scheduleTitle.trim().length > 0
			&& startTime.length > 0
			&& endTime.length > 0
			&& startTime < endTime
			&& (scheduleKind === 'lesson'
				? classSubjectId.length > 0
				: activityId.length > 0);
	});
	function resetForm() {
		if (schedule) {
			scheduleTitle = schedule.title;
			isRecurring = schedule.isRecurring;
			specificDate = schedule.specificDate?.slice(0, 10) ?? '';
			scheduleKind = schedule.scheduleKind;
			day = schedule.day;
			startTime = schedule.startTime;
			endTime = schedule.endTime;
			classSubjectId = schedule.classSubjectId ?? classSubjects[0]?.id ?? '';
			activityId = schedule.activityId ?? activityOptions[0]?.id ?? '';
		}
		else {
			scheduleTitle = '';
			isRecurring = true;
			specificDate = '';
			scheduleKind = defaultScheduleKind;
			day = 'Mon';
			startTime = '08:00';
			endTime = '09:00';
			classSubjectId = classSubjects[0]?.id ?? '';
			activityId = activityOptions[0]?.id ?? '';
		}
	}
	function handleScheduleKindChange(value: string | undefined) {
		if (!value || (value !== 'lesson' && value !== 'activity')) {
			return;
		}
		scheduleKind = value;
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
			const ok = await actionState.performUpdateSchedule({
				scheduleId: schedule.id,
				classGroupId: classId,
				scheduleKind,
				weekStart,
				isRecurring,
				specificDate,
				title: scheduleTitle,
				classSubjectId: scheduleKind === 'lesson' ? classSubjectId : null,
				activityId: scheduleKind === 'activity' ? activityId : null,
				day,
				startTime,
				endTime,
				successMessage: get(t)('planning.schedule.updateSuccess', { title: scheduleTitle.trim() }),
			});
			busy = false;
			if (ok) {
				await onSaved?.();
				open = false;
			}
		}
		else {
			const scheduleId = await actionState.performCreateSchedule({
				classGroupId: classId,
				scheduleKind,
				weekStart,
				isRecurring,
				specificDate,
				title: scheduleTitle,
				classSubjectId: scheduleKind === 'lesson' ? classSubjectId : undefined,
				activityId: scheduleKind === 'activity' ? activityId : undefined,
				day,
				startTime,
				endTime,
				successMessage: get(t)('planning.schedule.createSuccess', { title: scheduleTitle.trim() }),
			});
			busy = false;
			if (scheduleId) {
				await onSaved?.();
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
		class="text-xs"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{$t('common.edit')}
	</Button>
{/if}

<FormModal
	bind:open
	title={isEdit
		? $t('planning.schedule.editTitle')
		: scheduleKind === 'activity'
		? $t('planning.schedule.createActivityTitle')
		: $t('planning.schedule.createTitle')}
	description={isEdit
		? schedule?.title
		: scheduleKind === 'activity'
		? $t('planning.schedule.createActivityDescription')
		: $t('planning.schedule.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<label class="flex items-center gap-2"><input type="checkbox" bind:checked={isRecurring} />{$t('profile.isRecurring')}</label>
	{#if !isRecurring}<label>{$t('profile.specificDate')}<Input type="date" bind:value={specificDate} /></label>{/if}

	{#if !isEdit}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('planning.schedule.kind')}
			</Label>
			<Select.Root type="single" value={scheduleKind} onValueChange={handleScheduleKindChange}>
				<Select.Trigger>
					<Select.Value placeholder={$t('planning.schedule.kind')}>
						{$t(`planning.schedule.kind.${scheduleKind}`)}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each SCHEDULE_KINDS as kind (kind)}
						<Select.Item value={kind} label={$t(`planning.schedule.kind.${kind}`)}>
							{$t(`planning.schedule.kind.${kind}`)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	{/if}
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.title')}
		</Label>
		<Input bind:value={scheduleTitle} />
	</div>
	{#if scheduleKind === 'lesson' && classSubjects.length > 0}
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
						<Select.Item value={subject.id} label={catalogSubjectName(subject.name, $lang, subject.shortName)}>
							{catalogSubjectName(subject.name, $lang, subject.shortName)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	{:else if scheduleKind === 'activity'}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('planning.schedule.activityProgram')}
			</Label>
			{#if activityOptions.length === 0}
				<p class="text-xs text-muted-foreground">{$t('planning.schedule.noActivities')}</p>
			{:else}
				<Select.Root type="single" value={activityId} onValueChange={v => v && (activityId = v)}>
					<Select.Trigger>
						<Select.Value placeholder={$t('planning.schedule.activityProgram')}>
							{selectedActivityName}
						</Select.Value>
					</Select.Trigger>
					<Select.Content class="z-[100]">
						{#each activityOptions as activity (activity.id)}
							<Select.Item value={activity.id} label={activity.name}>{activity.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/if}
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
