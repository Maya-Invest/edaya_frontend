<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import { cancelPlanningEventMutation } from '$lib/api/mutations/planning.mutations';
	import PlanningFormModal from '$lib/components/school/scheduling/PlanningFormModal.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { getTimetablePageState } from '../../timetable-page.svelte';

	const {
		s,
	}: {
		s: PlanningEvent;
	} = $props();

	const timetablePage = getTimetablePageState();
	const isLesson = $derived(s.kind === 'lesson');
	const isActivity = $derived(s.kind === 'activity');
	const canCancel = $derived((isLesson || isActivity) && s.status !== 'cancelled');
	const canEditLesson = $derived(isLesson && s.status !== 'cancelled');

	let cancelOpen = $state(false);
	let cancelBusy = $state(false);

	type SessionDrawerModal = 'edit-event';

	const modals = createUrlSyncedModals<SessionDrawerModal>({
		allowed: ['edit-event'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editEventOpen = bindUrlModal(modals, 'edit-event');

	async function confirmCancel() {
		cancelBusy = true;
		try {
			const ok = await cancelPlanningEventMutation(s, {
				successMessage: get(t)('planning.toastCancelled', { title: s.title }),
			});
			if (ok) {
				timetablePage.patchEvent(s.id, { status: 'cancelled' });
				cancelOpen = false;
			}
		}
		finally {
			cancelBusy = false;
		}
	}
</script>

<DrawerEntityHeader
	name={s.title}
	summary="{$t(`day.full.${s.day}`)} · {s.start} — {s.end} · {$t(`planning.eventKind.${s.kind}`)} · {s.subject}"
>
	{#snippet chips()}
		{#if s.status === 'cancelled'}
			<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{$t('planning.occurrenceStatus.cancelled')}
			</span>
		{:else if s.status === 'completed'}
			<span class="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-foreground">
				{$t('planning.occurrenceStatus.completed')}
			</span>
		{/if}
	{/snippet}
	{#snippet actions()}
		{#if canEditLesson}
			<PlanningFormModal event={s} bind:open={editEventOpen.open} />
		{/if}
	{/snippet}
	{#snippet overflow()}
		{#if canCancel}
			<PermissionGate permission="TIMETABLE_UPDATE" mode="disable" tooltip={$t('calendar.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<RowActionMenuItem
						destructive
						{disabled}
						{title}
						onclick={() => (cancelOpen = true)}
					>
						{$t('planning.cancelConfirmTitle')}
					</RowActionMenuItem>
				{/snippet}
			</PermissionGate>
		{/if}
	{/snippet}
</DrawerEntityHeader>

<p class="text-sm text-muted-foreground">{s.teacher}</p>

<ConfirmModal
	bind:open={cancelOpen}
	title={$t('planning.cancelConfirmTitle')}
	description={$t('planning.cancelConfirm', { title: s.title })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={cancelBusy}
	onConfirm={confirmCancel}
/>
