<script lang="ts">
	import type { Activity, PlanningEvent, Subject } from '$lib/types/school';
	import { createAssessmentMutation } from '$lib/api/mutations/evaluation.mutations';
	import { createSessionMutation } from '$lib/api/mutations/planning.mutations';
	import { createScheduleMutation } from '$lib/api/mutations/schedule.mutations';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { sessionInstantsForSlot } from '$lib/components/school/scheduling/planning-calendar';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	type SessionKind = 'lesson' | 'activity' | 'assessment';
	type WizardStep = 1 | 2 | 3;

	const DAYS: PlanningEvent['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
	const SESSION_KINDS: SessionKind[] = ['lesson', 'activity', 'assessment'];

	let {
		classId,
		weekStart,
		subjects,
		activities,
		open = $bindable(false),
		onCreated,
		disabled = false,
		title,
	}: {
		classId: string;
		weekStart: Date;
		subjects: Subject[];
		activities: Activity[];
		open?: boolean;
		onCreated?: (sessionId: string) => void;
		disabled?: boolean;
		title?: string;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let step = $state<WizardStep>(1);
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
	const selectedSubjectName = $derived(
		classSubjects.find(subject => subject.id === classSubjectId)?.name ?? '',
	);
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
		step === 1
			? $t('planning.wizard.title')
			: step === 2
			? $t('planning.wizard.contextTitle')
			: $t('planning.wizard.scheduleTitle'),
	);

	const modalDescription = $derived(
		step === 1
			? $t('planning.wizard.description')
			: step === 2
			? $t('planning.wizard.contextDescription', { kind: kindLabel })
			: $t('planning.wizard.scheduleDescription'),
	);

	function resetForm() {
		step = 1;
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
		if (open && !activityId && activities[0]) {
			activityId = activities[0].id;
		}
	});

	function handleBack() {
		if (step > 1) {
			step = (step - 1) as WizardStep;
		}
	}

	function handleNext() {
		if (step === 1) {
			step = 2;
			return;
		}
		if (step === 2 && canAdvanceStep2) {
			step = 3;
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
				createdId = await createSessionMutation({
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
				createdId = await createScheduleMutation({
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
				const assessmentId = await createAssessmentMutation({
					classGroupId: classId,
					classSubjectId,
					title: sessionTitle,
					maxScore: numericMax,
					coefficient: numericCoef,
					kind: 'quiz',
					successMessage: get(t)('eval.createSuccess', { title: sessionTitle.trim() }),
				});

				if (assessmentId) {
					const client = getBrowserSchoolClient();
					const weekAnchor = weekStart.toISOString();
					const { startsAt, endsAt } = {
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
					const assessment = await client.entities.assessments.get(assessmentId);
					await client.entities.assessments.save({
						...assessment,
						startsAt,
						endsAt,
					});
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
	class="rounded-full"
	{disabled}
	{title}
	onclick={() => (open = true)}
>
	{$t('planning.newSession')}
</Button>

<FormModal
	bind:open
	title={modalTitle}
	description={modalDescription}
	submitLabel={step === 3 ? $t('planning.wizard.create') : $t('common.next')}
	busy={busy}
	submitDisabled={step === 3 ? !canSubmit : step === 2 ? !canAdvanceStep2 : false}
	onCancel={resetForm}
	onSubmit={step === 3 ? submit : handleNext}
>
	{#if step > 1}
		<button
			type="button"
			class="mb-2 text-xs font-medium text-muted-foreground hover:text-foreground"
			onclick={handleBack}
		>
			← {$t('common.back')}
		</button>
	{/if}
	{#if step === 1}
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
	{:else if step === 2}
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
								<Select.Item value={subject.id} label={subject.name}>{subject.name}</Select.Item>
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
								<Select.Item value={subject.id} label={subject.name}>{subject.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('eval.outOf')}
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
