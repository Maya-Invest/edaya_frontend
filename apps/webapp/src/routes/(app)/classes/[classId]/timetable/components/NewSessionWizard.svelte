<script lang="ts">
	import type { Activity, PlanningEvent, Subject } from '$lib/types/school';

	import type { NewSessionStep } from '../planning-surface';
	import { afterNavigate } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';

	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { lang, t } from '$lib/i18n';
	import { catalogSubjectName } from '$lib/i18n/catalog-label';
	import { sessionInstantsForSlot } from '$lib/scheduling/planning-calendar';
	import { get } from 'svelte/store';
	import { getPlanningTimetableState } from '../planning-timetable-state.svelte';

	const actionState = getPlanningTimetableState();

	type SessionKind = 'lesson' | 'activity' | 'assessment';

	const DAYS: PlanningEvent['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
	const SESSION_KINDS: SessionKind[] = ['lesson', 'activity', 'assessment'];

	let {
		classId,
		weekStart,
		subjects,
		activities,
		open = $bindable(false),
		step,
		onOpen,
		onStepChange,
		onCreated,
		disabled = false,
		title,
	}: {
		classId: string;
		weekStart: Date;
		subjects: Subject[];
		activities: Activity[];
		open?: boolean;
		step: NewSessionStep;
		onOpen?: () => void;
		onStepChange: (step: NewSessionStep, replace?: boolean) => void;
		onCreated?: (sessionId: string) => void;
		disabled?: boolean;
		title?: string;
	} = $props();

	let busy = $state(false);
	let sessionKind = $state<SessionKind>('lesson');
	let sessionTitle = $state('');
	let classSubjectId = $state('');
	let activityId = $state('');
	let maxScore = $state('20');
	let coefficient = $state('1');
	let day = $state<PlanningEvent['day']>('Mon');
	let start = $state('08:00');
	let end = $state('09:00');

	const classSubjects = $derived(subjects);
	const selectedSubjectName = $derived.by(() => {
		const subject = classSubjects.find(entry => entry.id === classSubjectId);
		return subject ? catalogSubjectName(subject.name, $lang, subject.code) : '';
	});
	const selectedActivityName = $derived(
		activities.find(activity => activity.id === activityId)?.name ?? '',
	);
	const kindLabel = $derived($t(`planning.wizard.kind.${sessionKind}`));

	const canAdvanceStep2 = $derived.by(() => {
		if (sessionKind === 'lesson') {
			return sessionTitle.trim().length > 0 && classSubjectId.length > 0;
		}
		if (sessionKind === 'activity') {
			return activityId.length > 0;
		}
		return sessionTitle.trim().length > 0 && classSubjectId.length > 0;
	});

	const canSubmit = $derived(
		canAdvanceStep2 && start.length > 0 && end.length > 0 && start < end,
	);

	const modalTitle = $derived(
		step === 'type'
			? $t('planning.wizard.title')
			: step === 'context'
			? $t('planning.wizard.contextTitle')
			: $t('planning.wizard.scheduleTitle'),
	);

	const modalDescription = $derived(
		step === 'type'
			? $t('planning.wizard.description')
			: step === 'context'
			? $t('planning.wizard.contextDescription', { kind: kindLabel })
			: $t('planning.wizard.scheduleDescription'),
	);

	function resetForm() {
		sessionKind = 'lesson';
		sessionTitle = '';
		classSubjectId = classSubjects[0]?.id ?? '';
		activityId = activities[0]?.id ?? '';
		maxScore = '20';
		coefficient = '1';
		day = 'Mon';
		start = '08:00';
		end = '09:00';
	}

	resetForm();

	afterNavigate(() => {
		if (open && step === 'schedule' && !canAdvanceStep2) {
			onStepChange('context', true);
		}
	});

	function handleOpen() {
		resetForm();
		if (onOpen) {
			onOpen();
		}
		else {
			open = true;
		}
	}

	function handleBack() {
		if (step === 'schedule') {
			onStepChange('context');
		}
		else if (step === 'context') {
			onStepChange('type');
		}
	}

	function handleNext() {
		if (step === 'type') {
			onStepChange('context');
			return;
		}
		if (step === 'context' && canAdvanceStep2) {
			onStepChange('schedule');
		}
	}

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		let createdId: string | null = null;

		try {
			if (sessionKind === 'lesson') {
				createdId = await actionState.performCreateSession({
					classGroupId: classId,
					title: sessionTitle,
					classSubjectId,
					weekStart,
					day,
					start,
					end,
					successMessage: get(t)('planning.createSuccess', { title: sessionTitle.trim() }),
				});
			}
			else if (sessionKind === 'activity') {
				const activity = activities.find(entry => entry.id === activityId);
				createdId = await actionState.performCreateSchedule({
					classGroupId: classId,
					scheduleKind: 'activity',
					title: activity?.name ?? $t('planning.wizard.activityFallback'),
					activityId,
					day,
					startTime: start,
					endTime: end,
					weekStart,
					successMessage: get(t)('planning.schedule.createSuccess', {
						title: activity?.name ?? $t('planning.wizard.activityFallback'),
					}),
				});
			}
			else {
				const numericMax = Number.parseFloat(maxScore);
				const numericCoef = Number.parseFloat(coefficient);
				const weekAnchor = weekStart.toISOString();
				const slot = {
					startsAt: sessionInstantsForSlot(weekAnchor, {
						day,
						startTime: start,
						endTime: end,
					}).startsAt.toISOString(),
					endsAt: sessionInstantsForSlot(weekAnchor, {
						day,
						startTime: start,
						endTime: end,
					}).endsAt.toISOString(),
				};
				const assessmentId = await actionState.performCreateAssessment({
					classGroupId: classId,
					classSubjectId,
					title: sessionTitle,
					maxScore: numericMax,
					coefficient: numericCoef,
					kind: 'quiz',
					startsAt: slot.startsAt,
					endsAt: slot.endsAt,
					successMessage: get(t)('eval.createSuccess', { title: sessionTitle.trim() }),
				});

				if (assessmentId) {
					createdId = assessmentId;
				}
			}
		}
		finally {
			busy = false;
		}

		if (createdId) {
			open = false;
			resetForm();
			onCreated?.(createdId);
		}
	}
</script>

<Button
	size="sm"

	{disabled}
	{title}
	onclick={handleOpen}
>
	{$t('planning.newSession')}
</Button>

<FormModal
	bind:open
	title={modalTitle}
	description={modalDescription}
	submitLabel={step === 'schedule' ? $t('planning.wizard.create') : $t('common.next')}
	busy={busy}
	submitDisabled={step === 'schedule' ? !canSubmit : step === 'context' ? !canAdvanceStep2 : false}
	onCancel={resetForm}
	onSubmit={step === 'schedule' ? submit : handleNext}
>
	{#if step !== 'type'}
		<button
			type="button"
			class="mb-2 text-xs font-medium text-muted-foreground hover:text-foreground"
			onclick={handleBack}
		>
			← {$t('common.back')}
		</button>
	{/if}
	{#if step === 'type'}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('planning.wizard.sessionType')}
			</Label>
			<Select.Root
				type="single"
				value={sessionKind}
				onValueChange={v => v && (sessionKind = v as SessionKind)}
			>
				<Select.Trigger>
					<Select.Value placeholder={$t('planning.wizard.sessionType')}>
						{kindLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each SESSION_KINDS as kind (kind)}
						<Select.Item value={kind} label={$t(`planning.wizard.kind.${kind}`)}>
							{$t(`planning.wizard.kind.${kind}`)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	{:else if step === 'context'}
		{#if sessionKind === 'lesson'}
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('drawer.title')}
				</Label>
				<Input bind:value={sessionTitle} />
			</div>
			{#if classSubjects.length === 0}
				<p class="text-xs text-muted-foreground">{$t('planning.createNoSubjects')}</p>
			{:else}
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
								<Select.Item value={subject.id} label={catalogSubjectName(subject.name, $lang, subject.code)}>
									{catalogSubjectName(subject.name, $lang, subject.code)}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
		{:else if sessionKind === 'activity'}
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('planning.schedule.activityProgram')}
				</Label>
				{#if activities.length === 0}
					<p class="text-xs text-muted-foreground">{$t('planning.schedule.noActivities')}</p>
				{:else}
					<Select.Root type="single" value={activityId} onValueChange={v => v && (activityId = v)}>
						<Select.Trigger>
							<Select.Value placeholder={$t('planning.schedule.activityProgram')}>
								{selectedActivityName}
							</Select.Value>
						</Select.Trigger>
						<Select.Content class="z-[100]">
							{#each activities as activity (activity.id)}
								<Select.Item value={activity.id} label={activity.name}>{activity.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
			</div>
		{:else}
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('drawer.title')}
				</Label>
				<Input bind:value={sessionTitle} />
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
								<Select.Item value={subject.id} label={catalogSubjectName(subject.name, $lang, subject.code)}>
									{catalogSubjectName(subject.name, $lang, subject.code)}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('eval.maxScore')}
					</Label>
					<Input type="number" min="1" step="0.5" bind:value={maxScore} />
				</div>
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('eval.coefficient')}
					</Label>
					<Input type="number" min="0.1" step="0.1" bind:value={coefficient} />
				</div>
			</div>
		{/if}
	{:else}
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
				<Input type="time" bind:value={start} />
			</div>
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('drawer.end')}
				</Label>
				<Input type="time" bind:value={end} />
			</div>
		</div>
	{/if}
</FormModal>
