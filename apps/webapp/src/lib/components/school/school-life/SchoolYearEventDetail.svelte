<script lang="ts">
	import type { SchoolYearEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteSchoolYearEventMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { locale, t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import SchoolYearEventFormModal from './SchoolYearEventFormModal.svelte';

	const { ev }: { ev: SchoolYearEvent } = $props();

	type SchoolYearEventDrawerModal = 'edit';

	const modals = createUrlSyncedModals<SchoolYearEventDrawerModal>({
		allowed: ['edit'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	const calTypeKey: Record<SchoolYearEvent['type'], string> = {
		holiday: 'calType.holiday',
		vacation: 'calType.vacation',
		closure: 'calType.closure',
		ceremony: 'calType.ceremony',
	};

	const scopeText = $derived(
		ev.scope === 'all'
			? $t('cal.scopeAll')
			: ev.scope.map(id => academicContext.classes.find(c => c.id === id)?.name ?? id).join(', '),
	);

	const dateSummary = $derived(
		`${new Date(ev.date).toLocaleDateString($locale, { day: 'numeric', month: 'long', year: 'numeric' })}${
			ev.endDate
				? ` — ${new Date(ev.endDate).toLocaleDateString($locale, {
					day: 'numeric',
					month: 'long',
					year: 'numeric',
				})}`
				: ''
		}`,
	);

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await deleteSchoolYearEventMutation(ev, {
				successMessage: get(t)('cal.toastDeleted', { title: ev.title }),
			});
			if (ok) {
				deleteOpen = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader name={ev.title} summary={dateSummary}>
		{#snippet chips()}
			<span
				class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				{$t(calTypeKey[ev.type])}
			</span>
		{/snippet}
		{#snippet actions()}
			<PermissionGate
				permission="TIMETABLE_UPDATE"
				mode="disable"
				tooltip={$t('calendar.permissionUpdate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						variant="outline"
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('edit')}
					>
						{$t('common.edit')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet overflow()}
			<PermissionGate
				permission="TIMETABLE_UPDATE"
				mode="disable"
				tooltip={$t('calendar.permissionUpdate')}
			>
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

	<DrawerField label={$t('drawer.title')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{ev.title}</div>
	</DrawerField>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('drawer.start')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{ev.date}</div>
		</DrawerField>
		<DrawerField label={$t('drawer.end')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{ev.endDate ?? ev.date}
			</div>
		</DrawerField>
	</div>
	<DrawerField label={$t('cal.typeLabel')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			{$t(calTypeKey[ev.type])}
		</div>
	</DrawerField>
	<DrawerField label={$t('cal.scopeLabel')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			{scopeText}
		</div>
	</DrawerField>
	<DrawerField label={$t('drawer.notes')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm whitespace-pre-wrap">
			{ev.description}
		</div>
	</DrawerField>
</div>

<SchoolYearEventFormModal event={ev} bind:open={editOpen.open} showTrigger={false} />

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('cal.deleteConfirm', { title: ev.title })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
