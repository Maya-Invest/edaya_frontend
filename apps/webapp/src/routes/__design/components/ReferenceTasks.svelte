<script lang="ts">
	import type { SessionAttendanceStatus } from '$lib/types/session-detail';
	import type { ReferenceCopy } from '../reference-copy';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import TaskSteps from '$lib/components/ui/TaskSteps.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import AttendanceRosterEditor from '../../(app)/classes/[classId]/attendance/components/AttendanceRosterEditor.svelte';
	import { completeRollCall } from '../../(app)/classes/[classId]/attendance/lib/roll-call';
	import ReferenceGrading from './ReferenceGrading.svelte';
	import ReferenceKeyboard from './ReferenceKeyboard.svelte';

	const { copy }: { copy: ReferenceCopy } = $props();
	let open = $state(false);
	let wide = $state(false);
	let taskOpen = $state(false);
	let rosterOpen = $state(false);
	let marks = $state<Record<string, SessionAttendanceStatus>>({});
	let savedMarks = $state('{}');
	const roster = [
		{ studentId: 'reference-a', studentName: 'Aminata Mariam Koné-Diabaté', studentInitials: 'AK' },
		{ studentId: 'reference-b', studentName: 'Benjamin Alexandre de la Fontaine-Montgomery', studentInitials: 'BM' },
	];
	let name = $state('Aminata Mariam Koné-Diabaté');
	let email = $state('famille@example.test');
	let taskName = $state('');
	let baseline = $state('');
	let step = $state('settings');
	let outcome = $state(false);
	const steps = $derived([{ key: 'settings', label: copy.settings }, { key: 'review', label: copy.review }, { key: 'result', label: copy.result }]);
	function openTask() {
		taskName = '';
		baseline = '';
		step = 'settings';
		outcome = false;
		taskOpen = true;
	}
	function saveTask() {
		baseline = taskName;
		outcome = true;
		step = 'result';
	}
</script>

<section id="tasks" class="reference-section space-y-4 bg-card p-4 md:p-6">
	<h2 class="font-display text-xl font-semibold">{copy.tasks}</h2>
	<p class="text-sm">{copy.invalidHint}</p>
	<div class="flex flex-wrap gap-2">
		<Button variant="outline" onclick={() => {
			wide = false;
			open = true;
		}}>{copy.shortForm}</Button>
		<Button variant="outline" onclick={() => {
			wide = true;
			open = true;
		}}>{copy.wideForm}</Button>
		<Button data-testid="reference-open-task" onclick={openTask}>{copy.task}</Button>
		<Button variant="outline" onclick={() => {
			marks = {};
			savedMarks = '{}';
			rosterOpen = true;
		}}>{copy.attendanceTask}</Button>
		<ReferenceGrading {copy} />
	</div>
	<ReferenceKeyboard {copy} />
</section>
<FormModal bind:open title={wide ? copy.wideTitle : copy.formTitle} description={copy.invalidHint} contentClass={wide ? 'max-w-3xl' : undefined} onSubmit={() => {
	open = false;
}}>
	<div class="space-y-2"><Label for="gallery-name">{copy.name}</Label><Input id="gallery-name" bind:value={name} required autocomplete="off" /></div>
	<div class="space-y-2"><Label for="gallery-email">{copy.email}</Label><Input id="gallery-email" type="email" bind:value={email} required autocomplete="off" /></div>
	<div class="space-y-2"><Label for="gallery-reason">{copy.reason} · {copy.optional}</Label><Textarea id="gallery-reason" /></div>
	{#snippet footer({ close, busy, submitDisabled })}<Button variant="outline" onclick={close} disabled={busy}>{copy.cancel}</Button><Button type="submit" data-reference-submit pendingLabel={copy.pending} aria-busy={busy} disabled={submitDisabled}>{$t('common.save')}</Button>{/snippet}
</FormModal>
<FormModal bind:open={taskOpen} presentation="task" title={copy.taskTitle} description={copy.taskHint} dirty={taskName !== baseline} onSubmit={saveTask} submitDisabled={!taskName.trim()}>
	{#snippet navigation()}<TaskSteps label={copy.tasks} {steps} current={step} onSelect={next => step = next} />{/snippet}
	{#if step === 'settings'}
		<div class="max-w-lg space-y-2"><Label for="reference-task-name">{copy.name}</Label><Input id="reference-task-name" data-testid="reference-task-name" bind:value={taskName} required /></div>
	{:else if step === 'review'}
		<dl class="max-w-lg space-y-2"><dt class="text-xs text-muted-foreground">{copy.name}</dt><dd class="break-words text-sm">{taskName || copy.absent}</dd></dl>
	{:else}
		<p role="status" class="text-sm">{outcome ? copy.saved : copy.notRecorded}</p>
	{/if}
	{#snippet footer({ close, submit })}
		<div class="flex w-full flex-wrap justify-between gap-2"><Button variant="outline" onclick={close}>{copy.close}</Button><div class="flex flex-wrap gap-2">
			{#if step !== 'settings'}<Button variant="outline" onclick={() => step = step === 'result' ? 'review' : 'settings'}>{copy.back}</Button>{/if}
			{#if step === 'settings'}<Button onclick={() => step = 'review'}>{copy.continue}</Button>{:else if step === 'review'}<Button disabled={!taskName.trim()} onclick={submit}>{copy.save}</Button>{/if}
		</div></div>
	{/snippet}
</FormModal>

<FormModal presentation="task" bind:open={rosterOpen} dirty={JSON.stringify(marks) !== savedMarks}
	title={copy.attendanceTask} description={copy.taskHint} submitDisabled={!completeRollCall(roster, marks) || JSON.stringify(marks) === savedMarks}
	onSubmit={() => { savedMarks = JSON.stringify(marks); }}>
	{#snippet navigation()}<p class="text-sm">{copy.attendanceHint}</p>{/snippet}
	{#if savedMarks !== '{}'}<p role="status" class="text-sm">{copy.saved}</p>{/if}
	<AttendanceRosterEditor rows={roster} bind:marks />
	{#snippet footer({ close, submit, submitDisabled })}
		<Button variant="outline" onclick={close}>{copy.close}</Button><Button onclick={submit} disabled={submitDisabled}>{copy.save}</Button>
	{/snippet}
</FormModal>
