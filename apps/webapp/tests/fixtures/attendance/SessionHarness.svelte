<script lang="ts">
	import type { PlanningEvent } from '../../../src/lib/types/school';
	import type { TimetablePageState } from '../../../src/routes/(app)/classes/[classId]/timetable/timetable-page.svelte';
	import ConfirmModal from '../../../src/lib/components/ui/ConfirmModal.svelte';
	import { provideDirtyWork } from '../../../src/lib/interaction/dirty-work.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '../../../src/lib/modal/modal-state.svelte';
	import { TASK_QUERY_KEYS } from '../../../src/lib/modal/modal-url';
	import { setLang, t } from '../../../src/lib/i18n';
	import SessionAttendanceTask from '../../../src/routes/(app)/classes/[classId]/timetable/[id]/(tabs)/attendance/components/SessionAttendanceTask.svelte';
	import { SessionAttendanceTabState, setSessionAttendanceTabState } from '../../../src/routes/(app)/classes/[classId]/timetable/[id]/(tabs)/attendance/session-attendance-tab.svelte';
	import { academicContext, controls, page } from './environment.svelte';
	academicContext.classes[0].attendanceMode = new URL(location.href).searchParams.has('daily') ? 'daily' : 'session';
	const kind = new URL(location.href).searchParams.get('kind') === 'activity' ? 'activity' : 'lesson';
	const session = { id: 'session', classId: 'a', kind, title: 'Mathematics · Class A', startsAt: '2026-10-25T14:00:00Z', start: '10:00', end: '11:00' } as PlanningEvent;
	const owner = new SessionAttendanceTabState(() => ({ classId: 'a', selectedSession: (_: string, id: string) => id === session.id ? session : undefined }) as unknown as TimetablePageState);
	setSessionAttendanceTabState(owner);
	const dirtyWork = provideDirtyWork();
	const tasks = createUrlSyncedModals({ getUrl: () => $page.url, allowed: ['attendance-roll-call'], owned: ['attendance-roll-call'], allowedTabs: ['session'], queryKeys: TASK_QUERY_KEYS });
	const taskOpen = bindUrlModal(tasks, 'attendance-roll-call');
	$effect(() => { tasks.hydrate(); });
</script>
<div class="p-6 space-y-4">
	<h1>Session attendance fixture</h1>
	<button onclick={() => tasks.open('attendance-roll-call', { target: session.id, tab: 'session' })}>Open session roll call</button>
	<button onclick={() => setLang('en')}>EN</button>
	<button onclick={() => setLang('fr')}>FR</button>
	<button onclick={() => controls.allowed = !controls.allowed}>Toggle permission</button>
	<pre data-testid="session-requests">{JSON.stringify(controls.sessionRequests)}</pre>
</div>
{#if taskOpen.open}
	{#key owner.scope}
		<SessionAttendanceTask {session} bind:open={taskOpen.open} />
	{/key}
{/if}
<ConfirmModal open={dirtyWork.pending !== null} title={$t('form.discardTitle')} description={$t('form.discardDescription')}
	confirmLabel={$t('form.discard')} cancelLabel={$t('form.keepEditing')} variant="destructive"
	onOpenChange={value => { if (!value) dirtyWork.cancel(); }} onConfirm={() => dirtyWork.discard()} onCancel={() => dirtyWork.cancel()} />
