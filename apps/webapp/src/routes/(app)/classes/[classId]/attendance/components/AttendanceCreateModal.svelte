<script lang="ts">
	import type { AttendanceDay } from '$lib/types/school';
	import type { SessionAttendanceStatus } from '$lib/types/session-detail';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { getAttendancePageState } from '../attendance-page.svelte';
	import { completeRollCall, markUnrecordedPresent, ROLL_CALL_STATUSES, validRollCallDate } from '../lib/roll-call';

	let { open = $bindable(false), onSaved }: { open?: boolean; onSaved: (day: AttendanceDay) => void } = $props();
	const attendancePage = getAttendancePageState();
	let date = $state(untrack(() => attendancePage.today));
	let marks = $state<Record<string, SessionAttendanceStatus>>({});
	const existing = $derived(attendancePage.daysFor(attendancePage.classId).find(day => day.date === date));
	const dateValid = $derived(validRollCallDate(date, attendancePage.today));
	const marked = $derived(attendancePage.roster.filter(row => marks[row.studentId]).length);
	const disabled = $derived(!attendancePage.canCreate || attendancePage.rosterLoading || attendancePage.rosterError || !dateValid || !!existing || !completeRollCall(attendancePage.roster, marks));

	onMount(() => {
		void attendancePage.loadCreationRoster();
	});
	onDestroy(() => attendancePage.cancelRosterLoad());

	async function submit() {
		if (disabled || attendancePage.creating) {
			return;
		}
		const saved = await attendancePage.createRollCall(date, marks);
		if (saved && open) {
			onSaved(saved);
		}
	}
</script>

<FormModal
	bind:open
	title={$t('attendanceDay.createTitle')}
	description={$t('attendanceDay.createDescription', { name: attendancePage.classNode?.name ?? '' })}
	submitLabel={$t('common.save')}
	cancelLabel={$t('common.cancel')}
	busy={attendancePage.creating}
	submitDisabled={disabled}
	contentClass="max-w-2xl"
	onSubmit={submit}
>
	<div class="space-y-2">
		<Label for="roll-call-date">{$t('attendanceDay.date')}</Label>
		<Input id="roll-call-date" type="date" bind:value={date} max={attendancePage.today} disabled={attendancePage.creating} aria-invalid={!dateValid} />
		{#if !dateValid}
			<p role="alert" class="text-sm text-destructive">{$t('attendanceDay.invalidDate')}</p>
		{/if}
	</div>
	{#if existing && !attendancePage.creating}
		<div class="space-y-2 rounded-xl border border-border p-3">
			<p role="status" class="text-sm">{$t('attendanceDay.alreadyExists')}</p>
			<Button variant="outline" onclick={() => onSaved(existing)}>{$t('attendanceDay.openExisting')}</Button>
		</div>
	{:else if attendancePage.rosterLoading}
		<p role="status" class="text-sm text-muted-foreground">{$t('attendanceDay.loadingRoster')}</p>
	{:else if attendancePage.rosterError}
		<div class="space-y-2">
			<p role="alert" class="text-sm text-destructive">{$t('attendanceDay.rosterFailed')}</p>
			<Button variant="outline" onclick={() => void attendancePage.loadCreationRoster()}>{$t('dataState.retry')}</Button>
		</div>
	{:else if attendancePage.roster.length === 0}
		<p class="text-sm text-muted-foreground">{$t('planning.session.noStudents')}</p>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<p role="status" class="text-sm tabular-nums">{$t('attendanceDay.recordedSummary', { recorded: marked, total: attendancePage.roster.length })}</p>
			<Button variant="outline" disabled={attendancePage.creating || marked === attendancePage.roster.length} onclick={() => { marks = markUnrecordedPresent(attendancePage.roster, marks); }}>
				{$t('attendanceDay.markAllPresent')}
			</Button>
		</div>
		<p class="text-sm text-muted-foreground">{$t('attendanceDay.markEveryone')}</p>
		<ul class="divide-y divide-border">
			{#each attendancePage.roster as row (row.studentId)}
				<li class="flex flex-wrap items-center justify-between gap-3 py-3">
					<Label for={`roll-call-${row.studentId}`} class="min-w-32 flex-1 break-words">{row.studentName}</Label>
					<Select.Root type="single" value={marks[row.studentId] ?? ''} disabled={attendancePage.creating} onValueChange={(value) => {
						if (value)
							marks = { ...marks, [row.studentId]: value as SessionAttendanceStatus };
					}}>
						<Select.Trigger id={`roll-call-${row.studentId}`} class="min-h-11 w-40 max-w-full" aria-label={$t('attendanceDay.studentStatus', { name: row.studentName })}>
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
	{/if}
</FormModal>
