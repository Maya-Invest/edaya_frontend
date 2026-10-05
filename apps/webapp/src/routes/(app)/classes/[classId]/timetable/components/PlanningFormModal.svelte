<script lang="ts">
	import type { PlanningEvent, Subject } from '$lib/types/school';

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

	const DAYS: PlanningEvent['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

	let {
		classId,
		event,
		subjects = [],
		weekStart = new Date(),
		open = $bindable(false),
		onCreated,
		disabled = false,
		title,
	}: {
		classId?: string;
		event?: PlanningEvent;
		subjects?: Subject[];
		weekStart?: Date;
		open?: boolean;
		onCreated?: (sessionId: string) => void;
		disabled?: boolean;
		title?: string;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let sessionTitle = $state('');
	let classSubjectId = $state('');
	let day = $state<PlanningEvent['day']>('Mon');
	let start = $state('08:00');
	let end = $state('09:00');

	const isEdit = $derived(event !== undefined);
	const resolvedClassId = $derived(classId ?? event?.classId ?? '');

	const classSubjects = $derived(
		subjects.filter(subject => subject.classId === resolvedClassId),
	);

	const selectedSubjectName = $derived.by(() => {
		const subject = classSubjects.find(entry => entry.id === classSubjectId);
		return subject ? catalogSubjectName(subject.name, $lang, subject.code) : '';
	});

	const canSubmit = $derived(
		sessionTitle.trim().length > 0 && resolvedClassId.length > 0 && start.length > 0 && end.length > 0 && start < end,
	);

	function resetForm() {
		if (event) {
			sessionTitle = event.title;
			day = event.day;
			start = event.start;
			end = event.end;
			const match = classSubjects.find(subject => subject.name === event.subject);
			classSubjectId = match?.id ?? classSubjects[0]?.id ?? '';
		}
		else {
			sessionTitle = '';
			day = 'Mon';
			start = '08:00';
			end = '09:00';
			classSubjectId = classSubjects[0]?.id ?? '';
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
		if (event) {
			const ok = await actionState.performUpdateSession({
				sessionId: event.id,
				title: sessionTitle,
				classSubjectId: classSubjectId || null,
				day,
				start,
				end,
				successMessage: get(t)('planning.updateSuccess', { title: sessionTitle.trim() }),
			});
			busy = false;
			if (ok) {
				open = false;
			}
		}
		else {
			const sessionId = await actionState.performCreateSession({
				classGroupId: resolvedClassId,
				title: sessionTitle,
				classSubjectId: classSubjectId || undefined,
				weekStart,
				day,
				start,
				end,
				successMessage: get(t)('planning.createSuccess', { title: sessionTitle.trim() }),
			});
			busy = false;
			if (sessionId) {
				open = false;
				resetForm();
				onCreated?.(sessionId);
			}
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
	title={isEdit ? $t('planning.editTitle') : $t('planning.createTitle')}
	description={isEdit ? event?.title : $t('planning.createDescription')}
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
</FormModal>
