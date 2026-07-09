<script lang="ts">
	import type { ClassNode, Incident, Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		recordIncidentMutation,
		updateIncidentMutation,
	} from '$lib/api/mutations/incident.mutations';
	import StudentPicker from '$lib/components/school/shared/pickers/StudentPicker.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	type IncidentKind = 'positive' | 'minor_infraction' | 'major_infraction' | 'emergency';

	const INCIDENT_KINDS: IncidentKind[] = [
		'positive',
		'minor_infraction',
		'major_infraction',
		'emergency',
	];

	let {
		incident,
		students = [],
		classes = [],
		open = $bindable(false),
		onCreated,
		disabled = false,
		title: triggerTitle,
	}: {
		incident?: Incident;
		students?: Student[];
		classes?: ClassNode[];
		open?: boolean;
		onCreated?: (incidentId: string) => void;
		disabled?: boolean;
		title?: string;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let studentId = $state('');
	let incidentTitle = $state('');
	let description = $state('');
	let kind = $state<IncidentKind>('minor_infraction');
	let date = $state('');

	const isEdit = $derived(incident !== undefined);
	const schoolId = $derived(academicContext.schools[0]?.id ?? '');

	const selectedStudent = $derived(students.find(entry => entry.id === studentId));
	const kindLabel = $derived($t(`events.kind.${kind}`));
	const studentClass = $derived(
		selectedStudent
			? classes.find(entry => entry.id === selectedStudent.classId)
			: undefined,
	);

	const canSubmit = $derived(
		incidentTitle.trim().length > 0 && description.trim().length > 0 && (isEdit || (studentId.length > 0 && schoolId.length > 0)),
	);

	function resetForm() {
		if (incident) {
			studentId = incident.studentId;
			incidentTitle = incident.summary.slice(0, 80);
			description = incident.summary;
			kind = 'minor_infraction';
			date = incident.date;
		}
		else {
			studentId = students[0]?.id ?? '';
			incidentTitle = '';
			description = '';
			kind = 'minor_infraction';
			date = new Date().toISOString().slice(0, 10);
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
		try {
			if (incident) {
				const ok = await updateIncidentMutation({
					incidentId: incident.id,
					title: incidentTitle,
					description,
					kind,
					date,
					successMessage: get(t)('events.updateSuccess'),
				});
				if (ok) {
					open = false;
				}
			}
			else {
				const incidentId = await recordIncidentMutation({
					schoolId,
					studentId,
					classGroupId: selectedStudent?.classId,
					title: incidentTitle,
					description,
					kind,
					date,
					successMessage: get(t)('events.createSuccess', {
						name: selectedStudent?.name ?? '',
					}),
				});
				if (incidentId) {
					open = false;
					resetForm();
					onCreated?.(incidentId);
				}
			}
		}
		finally {
			busy = false;
		}
	}
</script>

{#if isEdit}
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
	title={isEdit ? $t('events.editTitle') : $t('events.createTitle')}
	description={isEdit ? undefined : $t('events.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	{#if !isEdit}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('events.student')}
			</Label>
			<StudentPicker bind:value={studentId} {students} {classes} />
			{#if studentClass}
				<p class="text-xs text-muted-foreground">{studentClass.name}</p>
			{/if}
		</div>
	{/if}
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('events.titleField')}
		</Label>
		<Input bind:value={incidentTitle} />
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('events.date')}
			</Label>
			<Input type="date" bind:value={date} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('events.kindLabel')}
			</Label>
			<Select.Root type="single" value={kind} onValueChange={v => v && (kind = v as IncidentKind)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('events.kindLabel')}>
						{kindLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each INCIDENT_KINDS as entry (entry)}
						<Select.Item value={entry} label={$t(`events.kind.${entry}`)}>
							{$t(`events.kind.${entry}`)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('events.details')}
		</Label>
		<Textarea bind:value={description} rows={5} />
	</div>
</FormModal>
