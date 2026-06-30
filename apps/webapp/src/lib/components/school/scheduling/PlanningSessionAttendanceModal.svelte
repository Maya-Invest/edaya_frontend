<script lang="ts">
	import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';
	import { recordSessionStudentAttendanceMutation } from '$lib/api/mutations/planning-session.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const {
		sessionId,
		row,
		disabled = false,
		title,
	}: {
		sessionId: string;
		row: SessionAttendanceRow;
		disabled?: boolean;
		title?: string;
	} = $props();

	const STATUS_OPTIONS: SessionAttendanceStatus[] = ['present', 'absent', 'late'];

	let open = $state(false);
	let busy = $state(false);
	let wasOpen = $state(false);
	let status = $state<SessionAttendanceStatus>('present');

	const statusLabel = $derived($t(`attendance.${status}`));
	const isEdit = $derived(row.status !== undefined);

	function resetForm() {
		status = row.status ?? 'present';
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	async function submit() {
		busy = true;
		const ok = await recordSessionStudentAttendanceMutation({
			sessionId,
			studentId: row.studentId,
			status,
			attendanceId: row.attendanceId,
			successMessage: get(t)('planning.session.attendanceSuccess', { name: row.studentName }),
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

<Button
	variant="ghost"
	size="sm"
	class="h-7 rounded-full px-2.5 text-[11px]"
	{disabled}
	{title}
	onclick={() => (open = true)}
>
	{isEdit ? $t('common.edit') : $t('planning.session.recordAttendance')}
</Button>

<FormModal
	bind:open
	title={$t('planning.session.attendanceTitle', { name: row.studentName })}
	description={$t('planning.session.attendanceDescription')}
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
