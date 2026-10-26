<script lang="ts">
	import type { PageLoadState } from '$lib/page/load-state';
	import type { PlanningEvent } from '$lib/types/school';
	import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { isoToZonedDateAndTime } from '$lib/date/format';
	import { t } from '$lib/i18n';
	import { appPath } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { ApiError } from '@maya-invest/edaya-api-client';
	import { onDestroy, untrack } from 'svelte';
	import AttendanceRosterEditor from '../../../../../attendance/components/AttendanceRosterEditor.svelte';
	import { completeRollCall } from '../../../../../attendance/lib/roll-call';
	import { saveAttendanceDraft } from '../../../../lib/attendance-task';
	import { getSessionAttendanceTabState } from '../session-attendance-tab.svelte';

	let { session, open = $bindable(false) }: { session: PlanningEvent; open?: boolean } = $props();
	const attendanceState = getSessionAttendanceTabState();
	let rows = $state<SessionAttendanceRow[]>([]);
	let marks = $state<Record<string, SessionAttendanceStatus>>({});
	let baseline = $state<Partial<Record<string, SessionAttendanceStatus>>>({});
	let status = $state<PageLoadState>('loading');
	let busy = $state(false);
	let failed = $state<string[]>([]);
	let outcome = $state<{ saved: number; remaining: number } | null>(null);
	let mounted = true;
	let loadVersion = 0;
	const timeZone = $derived(academicContext.schools.find(row => row.id === academicContext.schoolScopeId)?.timeZone ?? 'UTC');
	const occurrenceDate = $derived(isoToZonedDateAndTime(session.startsAt, timeZone).date);
	const dirty = $derived(rows.some(row => marks[row.studentId] !== baseline[row.studentId]));
	const authorized = $derived(attendanceState.canRecord(session.id, session.kind));
	const validTarget = $derived($page.url.searchParams.get('taskTarget') === session.id
		&& $page.url.searchParams.get('taskPanel') === 'session' && !$page.url.searchParams.has('taskStep'));

	async function load() {
		const request = ++loadVersion;
		const scope = attendanceState.scope;
		status = 'loading';
		try {
			const detail = await attendanceState.loadRoster(session);
			if (!mounted || request !== loadVersion || scope !== attendanceState.scope)
				return;
			if (!detail) {
				status = 'unavailable';
				return;
			}
			rows = detail.map(row => ({ ...row }));
			marks = Object.fromEntries(rows.filter(row => row.status).map(row => [row.studentId, row.status!]));
			baseline = { ...marks };
			status = rows.length ? 'ready' : 'empty';
		}
		catch (error) {
			if (!mounted || request !== loadVersion || scope !== attendanceState.scope)
				return;
			status = error instanceof ApiError && error.status === 403 ? 'denied' : error instanceof ApiError && error.status === 404 ? 'unavailable' : 'error';
		}
	}
	$effect(() => {
		if (validTarget && authorized && status === 'loading')
			void untrack(load);
	});
	onDestroy(() => {
		mounted = false;
		loadVersion += 1;
	});

	async function submit() {
		if (busy || !authorized || !validTarget || status !== 'ready' || !completeRollCall(rows, marks) || !dirty)
			return;
		busy = true;
		failed = [];
		outcome = null;
		const scope = attendanceState.scope;
		const isCurrent = () => mounted && open && scope === attendanceState.scope;
		const canContinue = () => isCurrent() && attendanceState.canRecord(session.id, session.kind);
		try {
			const progress = await saveAttendanceDraft({
				rows,
				draft: { ...marks },
				baseline: { ...baseline },
				canContinue,
				saveBatch: session.kind === 'lesson' ? attendanceByStudent => attendanceState.recordBulkAttendance({ sessionId: session.id, attendanceByStudent }) : undefined,
				saveRow: (row, status) => attendanceState.recordStudentAttendance({ sessionId: session.id, kind: session.kind, studentId: row.studentId, attendanceId: row.attendanceId, status }),
				onSaved: (saved) => {
					if (isCurrent())
						baseline = { ...baseline, ...saved };
				},
			});
			if (isCurrent()) {
				failed = progress.failed;
				outcome = { saved: progress.saved.length, remaining: progress.remaining.length };
			}
		}
		finally {
			if (mounted)
				busy = false;
		}
	}
</script>

<FormModal presentation="task" bind:open {dirty} {busy} title={$t('attendanceTask.title')} onSubmit={submit}
	submitDisabled={!authorized || !validTarget || status !== 'ready' || !dirty || !completeRollCall(rows, marks)}>
	{#snippet navigation()}
		<div class="space-y-2 text-sm">
			<p class="break-words">{session.title} · {occurrenceDate} · {session.start}–{session.end} ({timeZone})</p>
			<p>{$t(session.kind === 'lesson' ? 'attendanceTask.batchUnit' : 'attendanceTask.rowUnit')}</p>
			{#if status === 'ready' && authorized && validTarget}<p role="status" class="tabular-nums">{$t('attendanceTask.draftSummary', { recorded: rows.filter(row => marks[row.studentId]).length, total: rows.length })}</p>{/if}
		</div>
	{/snippet}
	{#if !validTarget}<DataState status="unavailable" />
	{:else if attendanceState.dailyMode}
		<p class="text-sm">{$t('attendanceTask.dailyMode')}</p>
		<a class={buttonVariants({ variant: 'outline', class: 'hover:bg-sky-soft active:bg-background' })} href={`${appPath('/(app)/classes/[classId]/attendance', { classId: session.classId })}${detailNavigationSearch($page.url)}`}>{$t('tab.attendance')}</a>
	{:else if !authorized}<div role="status" class="space-y-4"><h2 class="text-xl font-semibold">{$t('dataState.denied')}</h2><p>{$t('attendanceDay.permissionRecord')}</p></div>
	{:else if status !== 'ready'}<DataState {status} onRetry={() => void load()} emptyTitle={$t('planning.session.noStudents')} />
	{:else}
		{#if outcome}<p role="status" class="text-sm">{$t(outcome.remaining ? 'attendanceTask.partial' : 'attendanceTask.saved', outcome)}</p>{/if}
		<AttendanceRosterEditor {rows} bind:marks disabled={busy} {failed} />
	{/if}
	{#snippet footer({ close, submit, busy, submitDisabled })}
		<Button variant="outline" onclick={close}>{$t('common.close')}</Button>
		<Button onclick={submit} aria-busy={busy} pendingLabel={$t('form.saving')} disabled={busy || submitDisabled}>{$t('common.save')}</Button>
	{/snippet}
</FormModal>
