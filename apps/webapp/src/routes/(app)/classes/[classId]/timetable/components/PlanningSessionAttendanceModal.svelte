<script lang="ts">
	import type { PlanningEventKind } from '$lib/types/school';
	import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';

	let {
		sessionId,
		kind = 'lesson',
		row,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
		onRecord,
	}: {
		sessionId: string;
		kind?: PlanningEventKind;
		row: SessionAttendanceRow;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
		onRecord: (input: {
			sessionId: string;
			kind?: PlanningEventKind;
			studentId: string;
			status: SessionAttendanceStatus;
			attendanceId?: string;
			successMessage?: string;
		}) => Promise<boolean>;
	} = $props();

	const STATUS_OPTIONS: SessionAttendanceStatus[] = ['present', 'absent', 'late'];

	let busy = $state(false);
	let wasOpen = $state(false);
	let status = $state<SessionAttendanceStatus>('present');
	let baseline = $state<SessionAttendanceStatus>('present');
	let lifetime = 0;
	let mounted = true;
	onDestroy(() => {
		mounted = false;
	});

	const statusLabel = $derived($t(`attendance.${status}`));
	const isEdit = $derived(row.status !== undefined);

	function resetForm() {
		status = row.status ?? 'present';
		baseline = status;
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		if (open !== wasOpen)
			lifetime += 1;
		wasOpen = open;
	});

	async function submit() {
		if (busy || disabled)
			return;
		const requestLifetime = lifetime;
		busy = true;
		const input = {
			sessionId,
			kind,
			studentId: row.studentId,
			status,
			attendanceId: row.attendanceId,
			successMessage: get(t)('planning.session.attendanceSuccess', { name: row.studentName }),
		};
		const ok = await onRecord(input);
		busy = false;
		if (ok && mounted && open && lifetime === requestLifetime) {
			baseline = status;
			open = false;
		}
	}
</script>

{#if showTrigger}
	<Button
		variant="ghost"
		size="sm"
		class="min-h-11"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{isEdit ? $t('common.edit') : $t('planning.session.recordAttendance')}
	</Button>
{/if}

<FormModal
	bind:open
	title={$t('planning.session.attendanceTitle', { name: row.studentName })}
	description={$t('planning.session.attendanceDescription')}
	submitLabel={$t('common.save')}
	{busy}
	dirty={status !== baseline}
	submitDisabled={disabled}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label for="session-attendance-status" class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
			{$t('students.status')}
		</Label>
		<Select.Root disabled={busy} type="single" value={status} onValueChange={v => v && (status = v as SessionAttendanceStatus)}>
			<Select.Trigger id="session-attendance-status">
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
