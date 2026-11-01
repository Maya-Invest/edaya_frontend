<script lang="ts">
	import type { AttendanceDay } from '$lib/types/school';
	import type { SessionAttendanceStatus } from '$lib/types/session-detail';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { getAttendancePageState } from '../attendance-page.svelte';
	import { completeRollCall, validRollCallDate } from '../lib/roll-call';
	import AttendanceRosterEditor from './AttendanceRosterEditor.svelte';

	let { open = $bindable(false), onSaved }: { open?: boolean; onSaved: (day: AttendanceDay) => void } = $props();
	const attendancePage = getAttendancePageState();
	const dirtyWork = getDirtyWork();
	let date = $state(untrack(() => attendancePage.today));
	let marks = $state<Record<string, SessionAttendanceStatus>>({});
	let baseline = $state(untrack(() => JSON.stringify([date, marks])));
	let mounted = true;
	const dirty = $derived(JSON.stringify([date, marks]) !== baseline);
	const existing = $derived(attendancePage.existingCreationDay?.date === date ? attendancePage.existingCreationDay : attendancePage.daysFor(attendancePage.classId).find(day => day.date === date));
	const dateValid = $derived(validRollCallDate(date, attendancePage.today));
	const marked = $derived(attendancePage.roster.filter(row => marks[row.studentId]).length);
	const disabled = $derived(!attendancePage.canCreate || attendancePage.rosterLoading || attendancePage.rosterError || !dateValid || !!existing || !completeRollCall(attendancePage.roster, marks));

	onMount(() => {
		void attendancePage.loadCreationRoster();
	});
	onDestroy(() => {
		mounted = false;
		attendancePage.cancelRosterLoad();
	});

	function openExisting(day: AttendanceDay) {
		if (dirtyWork)
			dirtyWork.request(() => onSaved(day));
		else onSaved(day);
	}

	async function submit() {
		if (disabled || attendancePage.creating) {
			return;
		}
		const submittedDraft = JSON.stringify([date, marks]);
		const saved = await attendancePage.createRollCall(date, marks);
		if (saved && open && mounted) {
			baseline = submittedDraft;
			onSaved(saved);
		}
	}
</script>

<FormModal
	presentation="task"
	{dirty}
	bind:open
	title={$t('attendanceDay.createTitle')}
	description={$t('attendanceDay.createDescription', { name: attendancePage.classNode?.name ?? '' })}
	submitLabel={$t('common.save')}
	cancelLabel={$t('common.cancel')}
	busy={attendancePage.creating}
	submitDisabled={disabled}
	onSubmit={submit}
>
	{#snippet navigation()}
		<div class="flex flex-wrap justify-between gap-2 text-sm">
			<p class="text-muted-foreground">{attendancePage.classNode?.name} · {attendancePage.timeZone}</p>
			{#if attendancePage.rosterStatus === 'ready' && !existing}<p role="status" class="tabular-nums">{$t('attendanceTask.draftSummary', { recorded: marked, total: attendancePage.roster.length })}</p>{/if}
		</div>
	{/snippet}
	{#if attendancePage.creationOutcome === 'failed'}<p role="alert" class="text-sm text-destructive">{$t('attendanceDay.createFailed')}</p>{/if}
	<div class="max-w-lg space-y-2">
		<Label for="roll-call-date">{$t('attendanceDay.date')}</Label>
		<Input id="roll-call-date" type="date" bind:value={date} max={attendancePage.today} disabled={attendancePage.creating || !attendancePage.canCreate} aria-invalid={!dateValid} />
		{#if !dateValid}
			<p role="alert" class="text-sm text-destructive">{$t('attendanceDay.invalidDate')}</p>
		{/if}
	</div>
	{#if !attendancePage.canCreate}
		<DataState status={attendancePage.rosterStatus === 'unavailable' ? 'unavailable' : 'denied'} />
	{:else if existing && !attendancePage.creating}
		<div class="space-y-2 rounded-collection border border-border p-3">
			<p role="status" class="text-sm">{$t('attendanceDay.alreadyExists')}</p>
			<Button variant="outline" onclick={() => { openExisting(existing); }}>{$t('attendanceDay.openExisting')}</Button>
		</div>
	{:else if attendancePage.rosterStatus !== 'ready'}
		<DataState status={attendancePage.rosterStatus} errorMessage={$t('attendanceDay.rosterFailed')}
			emptyTitle={$t('planning.session.noStudents')} onRetry={() => void attendancePage.loadCreationRoster()} />
	{:else}
		<AttendanceRosterEditor rows={attendancePage.roster} bind:marks disabled={attendancePage.creating} />
	{/if}
	{#snippet footer({ close, submit, busy, submitDisabled })}
		<Button data-testid="form-modal-cancel" variant="outline" onclick={close}>{$t('common.close')}</Button>
		<Button data-testid="form-modal-submit" onclick={submit} aria-busy={busy} pendingLabel={$t('form.saving')} disabled={busy || submitDisabled}>{$t('common.save')}</Button>
	{/snippet}
</FormModal>
