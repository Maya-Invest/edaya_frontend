<script lang="ts">
	import type { Activity } from '$lib/types/school';
	import { page } from '$app/stores';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { fmtActivityDate } from '$lib/components/school/shared/drawer-constants';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { getActivitiesPageState } from '../../activities-page.svelte';
	import ActivityFormModal from '../../components/ActivityFormModal.svelte';

	const {
		activity,
		onDeleted,
	}: {
		activity: Activity;
		onDeleted?: () => void;
	} = $props();

	const activitiesPage = getActivitiesPageState();
	const live = $derived(activitiesPage.findActivity(activity.id) ?? activity);

	const modals = createUrlSyncedModals({ allowed: ['edit'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await activitiesPage.deleteActivity(live.id, {
				successMessage: get(t)('activities.toastDeleted', { name: live.name }),
			});
			if (ok) {
				deleteOpen = false;
				onDeleted?.();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<DrawerEntityHeader
	name={live.name}
	summary="{fmtActivityDate(live.startDate)} → {fmtActivityDate(live.endDate)}"
>
	{#snippet chips()}
		<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase text-foreground/80">
			{$t(`activities.cat.${live.category}`)}
		</span>
		<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground/80">
			{live.enrollments.length}/{live.capacity}
		</span>
	{/snippet}
	{#snippet actions()}
		<PermissionGate permission="DISCIPLINE_CREATE" mode="disable" tooltip={$t('activities.permissionCreate')}>
			{#snippet children({ disabled, title })}
				<ActivityFormModal activity={live} bind:open={editOpen.open} {disabled} {title} />
			{/snippet}
		</PermissionGate>
	{/snippet}
	{#snippet overflow()}
		<PermissionGate permission="DISCIPLINE_CREATE" mode="disable" tooltip={$t('activities.permissionCreate')}>
			{#snippet children({ disabled, title })}
				<RowActionMenuItem
					destructive
					{disabled}
					{title}
					onclick={() => (deleteOpen = true)}
				>
					{$t('common.delete')}
				</RowActionMenuItem>
			{/snippet}
		</PermissionGate>
	{/snippet}
</DrawerEntityHeader>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('activities.deleteConfirm', { name: live.name })}
	confirmLabel={$t('common.delete')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
