<script lang="ts">
	import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { markUnrecordedPresent, ROLL_CALL_STATUSES } from '../lib/roll-call';

	let { rows, marks = $bindable({}), disabled = false, failed = [] }: {
		rows: readonly SessionAttendanceRow[];
		marks?: Record<string, SessionAttendanceStatus>;
		disabled?: boolean;
		failed?: string[];
	} = $props();
</script>

<div class="space-y-4">
	<Button variant="outline" disabled={disabled || rows.every(row => marks[row.studentId])} onclick={() => { marks = markUnrecordedPresent(rows, marks); }}>
		{$t('attendanceDay.markAllPresent')}
	</Button>
	<p class="text-sm text-muted-foreground">{$t('attendanceDay.markEveryone')}</p>
	<ul class="divide-y divide-border">
		{#each rows as row (row.studentId)}
			<li class="flex flex-wrap items-center justify-between gap-4 p-4">
				<div class="min-w-0 flex-1 basis-48 break-words">
					<Label for={`roll-call-${row.studentId}`}>{row.studentName}</Label>
					{#if failed.includes(row.studentId)}<p class="text-sm text-destructive">{$t('attendanceTask.rowFailed')}</p>{/if}
				</div>
				<Select.Root type="single" value={marks[row.studentId] ?? ''} {disabled} onValueChange={(value) => {
					if (value)
						marks = { ...marks, [row.studentId]: value as SessionAttendanceStatus };
				}}>
					<Select.Trigger id={`roll-call-${row.studentId}`} class="w-40 max-w-full" aria-label={$t('attendanceDay.studentStatus', { name: row.studentName })}>
						<Select.Value placeholder={$t('planning.session.notRecorded')}>
							{marks[row.studentId] ? $t(`attendance.${marks[row.studentId]}`) : $t('planning.session.notRecorded')}
						</Select.Value>
					</Select.Trigger>
					<Select.Content class="z-[100]">
						{#each ROLL_CALL_STATUSES as status (status)}
							<Select.Item value={status} label={$t(`attendance.${status}`)}>{$t(`attendance.${status}`)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</li>
		{/each}
	</ul>
</div>
