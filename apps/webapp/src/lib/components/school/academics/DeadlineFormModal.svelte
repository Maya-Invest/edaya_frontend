<script lang="ts">
	import type { Deadline } from '$lib/types/school';
	import {
		createHomeworkMutation,
		updateHomeworkMutation,
	} from '$lib/api/mutations/homework.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const DEADLINE_TYPES: Deadline['type'][] = ['Homework', 'Project', 'Reading', 'Lab'];

	let {
		deadline,
		classId,
		open = $bindable(false),
		onCreated,
		disabled = false,
		title: triggerTitle,
		showTrigger = true,
	}: {
		deadline?: Deadline;
		classId: string;
		open?: boolean;
		onCreated?: (deadlineId: string) => void;
		disabled?: boolean;
		title?: string;
		showTrigger?: boolean;
	} = $props();

	let busy = $state(false);
	let title = $state('');
	let description = $state('');
	let classSubjectId = $state('');
	let assignedDate = $state('');
	let dueDate = $state('');
	let type = $state<Deadline['type']>('Homework');

	const isEdit = $derived(deadline !== undefined);

	const classSubjects = $derived(detailDataContext.subjectsForClass(classId));
	const selectedSubjectLabel = $derived(
		classSubjects.find(subject => subject.id === classSubjectId)?.name ?? '',
	);

	const canSubmit = $derived(
		title.trim().length > 0 && classSubjectId.length > 0 && assignedDate.length > 0 && dueDate.length > 0,
	);

	function resetForm() {
		if (deadline) {
			title = deadline.title;
			description = deadline.description;
			classSubjectId = classSubjects.find(entry => entry.name === deadline.subject)?.id ?? classSubjects[0]?.id ?? '';
			assignedDate = deadline.assignedDate;
			dueDate = deadline.dueDate;
			type = deadline.type;
		}
		else {
			title = '';
			description = '';
			classSubjectId = classSubjects[0]?.id ?? '';
			assignedDate = new Date().toISOString().slice(0, 10);
			dueDate = new Date().toISOString().slice(0, 10);
			type = 'Homework';
		}
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	$effect(() => {
		if (open && !classSubjectId && classSubjects[0]) {
			classSubjectId = classSubjects[0].id;
		}
	});

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		try {
			if (deadline) {
				const ok = await updateHomeworkMutation({
					assignmentId: deadline.id,
					title,
					description,
					assignedDate,
					dueDate,
					type,
					successMessage: get(t)('hw.updateSuccess', { title: title.trim() }),
				});
				if (ok) {
					open = false;
				}
			}
			else {
				const deadlineId = await createHomeworkMutation({
					classGroupId: classId,
					classSubjectId,
					title,
					description,
					assignedDate,
					dueDate,
					type,
					successMessage: get(t)('hw.createSuccess', { title: title.trim() }),
				});
				if (deadlineId) {
					open = false;
					resetForm();
					onCreated?.(deadlineId);
				}
			}
		}
		finally {
			busy = false;
		}
	}
</script>

{#if isEdit && showTrigger}
	<Button
		variant="outline"
		size="sm"
		class="rounded-full"
		disabled={disabled}
		title={triggerTitle}
		onclick={() => (open = true)}
	>
		{$t('common.edit')}
	</Button>
{/if}

<FormModal
	bind:open
	title={isEdit ? $t('hw.editTitle') : $t('hw.createTitle')}
	description={isEdit ? deadline?.title : $t('hw.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('hw.titleField')}
		</Label>
		<Input bind:value={title} />
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('hw.subjectField')}
		</Label>
		<Select.Root type="single" value={classSubjectId} onValueChange={v => v && (classSubjectId = v)}>
			<Select.Trigger>
				<Select.Value placeholder={$t('hw.selectSubject')}>
					{selectedSubjectLabel || $t('hw.selectSubject')}
				</Select.Value>
			</Select.Trigger>
			<Select.Content>
				{#each classSubjects as subject (subject.id)}
					<Select.Item value={subject.id} label={subject.name}>{subject.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
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
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('hw.typeField')}
		</Label>
		<Select.Root type="single" value={type} onValueChange={v => v && (type = v as Deadline['type'])}>
			<Select.Trigger>
				<Select.Value>{$t(`deadlineType.${type}`)}</Select.Value>
			</Select.Trigger>
			<Select.Content>
				{#each DEADLINE_TYPES as entry (entry)}
					<Select.Item value={entry} label={$t(`deadlineType.${entry}`)}>
						{$t(`deadlineType.${entry}`)}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('hw.descriptionField')}
		</Label>
		<Textarea bind:value={description} rows={4} />
	</div>
</FormModal>
