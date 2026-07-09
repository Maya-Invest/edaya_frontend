<script lang="ts">
	import type { SessionAttendanceStatus } from '$lib/types/session-detail';
	import { recordDailyAttendanceForDayMutation } from '$lib/api/mutations/attendance.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		occurrenceId,
		classGroupId,
		date,
		studentId,
		studentName,
		attendanceId,
		status: initialStatus,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
	}: {
		occurrenceId: string;
		classGroupId: string;
		date: string;
		studentId: string;
		studentName: string;
		attendanceId?: string;
		status?: SessionAttendanceStatus;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
	} = $props();

	const STATUS_OPTIONS: SessionAttendanceStatus[] = ['present', 'absent', 'late'];

	let busy = $state(false);
	let wasOpen = $state(false);
	let status = $state<SessionAttendanceStatus>('present');

	const statusLabel = $derived($t(`attendance.${status}`));
	const isEdit = $derived(initialStatus !== undefined);

	function resetForm() {
		status = initialStatus ?? 'present';
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	async function submit() {
		busy = true;
		const ok = await recordDailyAttendanceForDayMutation({
			occurrenceId,
			classGroupId,
			date,
			studentId,
			status,
			attendanceId,
			successMessage: get(t)('attendanceDay.recordSuccess', { name: studentName }),
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

{#if showTrigger}
	<Button
		variant="ghost"
		size="sm"
		class="h-7 rounded-full px-2.5 text-[11px]"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{isEdit ? $t('common.edit') : $t('attendanceDay.record')}
	</Button>
{/if}

<FormModal
	bind:open
	title={$t('attendanceDay.recordTitle', { name: studentName })}
	description={$t('attendanceDay.recordDescription')}
	submitLabel={$t('common.save')}
	{busy}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('students.status')}
		</Label>
		<Select.Root type="single" value={status} onValueChange={v => v && (status = v as SessionAttendanceStatus)}>
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
