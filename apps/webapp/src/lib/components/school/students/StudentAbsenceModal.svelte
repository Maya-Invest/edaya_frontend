<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { recordStudentDailyAttendanceMutation } from '$lib/api/mutations/student.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { get } from 'svelte/store';

	let {
		s,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
	}: {
		s: Student;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
	} = $props();

	type AttendanceStatus = 'absent' | 'late';

	const STATUS_OPTIONS: AttendanceStatus[] = ['absent', 'late'];

	let busy = $state(false);
	let wasOpen = $state(false);
	let date = $state(new Date().toISOString().slice(0, 10));
	let status = $state<AttendanceStatus>('absent');

	const statusLabel = $derived($t(`attendance.${status}`));

	const canSubmit = $derived(date.length > 0);

	function resetForm() {
		date = new Date().toISOString().slice(0, 10);
		status = 'absent';
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
		const ok = await recordStudentDailyAttendanceMutation({
			studentId: s.id,
			classGroupId: s.classId,
			date,
			status,
			successMessage: get(t)('student.absenceSuccess', { name: s.name }),
		});
		busy = false;
		if (ok) {
			open = false;
			resetForm();
		}
	}
</script>

{#if showTrigger}
	<Button
		variant="ghost"
		class="w-full rounded-full border border-dashed border-border"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		<Plus class="mr-1 h-4 w-4" /> Déclarer une absence
	</Button>
{/if}

<FormModal
	bind:open
	title={`Déclarer une absence pour ${s.name}`}
	description="La déclaration est enregistrée sur la journée sélectionnée."
	submitLabel="Enregistrer"
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</Label>
		<Input type="date" bind:value={date} />
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Statut</Label>
		<Select.Root type="single" value={status} onValueChange={v => v && (status = v as AttendanceStatus)}>
			<Select.Trigger>
				<Select.Value placeholder={$t('students.status')}>
					{statusLabel}
				</Select.Value>
			</Select.Trigger>
			<Select.Content class="z-[100]">
				{#each STATUS_OPTIONS as entry (entry)}
					<Select.Item value={entry} label={$t(`attendance.${entry}`)}>
						{$t(`attendance.${entry}`)}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
</FormModal>
