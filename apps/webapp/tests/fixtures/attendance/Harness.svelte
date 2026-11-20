<script lang="ts">
	import type { AttendanceDay } from '../../../src/lib/types/school';
	import { onMount } from 'svelte';
	import ConfirmModal from '../../../src/lib/components/ui/ConfirmModal.svelte';
	import { provideDirtyWork } from '../../../src/lib/interaction/dirty-work.svelte';
	import { setLang, t } from '../../../src/lib/i18n';
	import { bindUrlModal } from '../../../src/lib/modal/modal-state.svelte';
	import { openDetailDrawer, currentRouteSurfaceHref, stripModalSearch } from '../../../src/lib/navigation/route-surface-navigation';
	import { AttendancePageState, setAttendancePageState } from '../../../src/routes/(app)/classes/[classId]/attendance/attendance-page.svelte';
	import AttendanceList from '../../../src/routes/(app)/classes/[classId]/attendance/components/AttendanceList.svelte';
	import AttendanceCreateModal from '../../../src/routes/(app)/classes/[classId]/attendance/components/AttendanceCreateModal.svelte';
	import { academicContext, controls, page } from './environment.svelte';
	const dirtyWork = provideDirtyWork();
	const attendancePage = new AttendancePageState(() => $page.url);
	setAttendancePageState(attendancePage);
	const createOpen = bindUrlModal(attendancePage.modals, 'attendance-roll-call');
	let ready = $state(false);
	$effect(() => attendancePage.hydrateTask());
	onMount(async () => { await attendancePage.refreshSlice('a'); ready = true; });
	function selectDay(day: AttendanceDay) {
		openDetailDrawer(`/classes/a/attendance/${encodeURIComponent(day.id)}${stripModalSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
	function created(day: AttendanceDay) { attendancePage.modals.close(); selectDay(day); }
</script>
<div class="p-6">
	<div class="mb-6 flex flex-wrap gap-3">
		<button onclick={() => setLang('en')}>EN</button>
		<button data-testid="fr" onclick={() => setLang('fr')}>FR</button>
		<button data-testid="denied" onclick={() => controls.allowed = !controls.allowed}>Permission</button>
		<button data-testid="fail-write" onclick={() => controls.failWrite = !controls.failWrite}>Fail write</button>
		<button data-testid="fail-roster" onclick={() => controls.failRoster = !controls.failRoster}>Fail roster</button>
		<button data-testid="empty" onclick={() => controls.empty = !controls.empty}>Empty roster</button>
		<button data-testid="scope" onclick={() => academicContext.yearId = 'other'}>Change year</button>
	</div>
	{#if ready}<span data-testid="ready"></span>{/if}
	<AttendanceList classId="a" onSelect={selectDay} />
	<output class="sr-only" data-testid="selected">{attendancePage.selectedId ?? ''}</output>
	<output class="sr-only" data-testid="requests">{JSON.stringify(controls.requests)}</output>
</div>
{#if createOpen.open}
	{#key attendancePage.scope}
		<AttendanceCreateModal bind:open={createOpen.open} onSaved={created} />
	{/key}
{/if}

<ConfirmModal open={dirtyWork.pending !== null} title={$t('form.discardTitle')} description={$t('form.discardDescription')}
	confirmLabel={$t('form.discard')} cancelLabel={$t('form.keepEditing')} variant="destructive"
	onOpenChange={value => { if (!value) dirtyWork.cancel(); }} onConfirm={() => dirtyWork.discard()} onCancel={() => dirtyWork.cancel()} />
