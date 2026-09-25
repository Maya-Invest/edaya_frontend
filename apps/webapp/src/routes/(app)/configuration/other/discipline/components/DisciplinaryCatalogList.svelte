<script lang="ts">
	import type { DisciplinaryActionCatalogItem } from '$lib/types/discipline';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, Plus, Trash2 } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getDisciplinePageState } from '../discipline-page.svelte';
	import DisciplinaryActionFormModal from './DisciplinaryActionFormModal.svelte';

	const disciplinePage = getDisciplinePageState();

	const modals = createUrlSyncedModals({
		allowed: ['create', 'edit', 'delete'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const editOpen = bindUrlModal(modals, 'edit');
	const deleteOpen = bindUrlModal(modals, 'delete');

	let deleteBusy = $state(false);

	const targetAction = $derived.by((): DisciplinaryActionCatalogItem | null => {
		if (!modals.target) {
			return null;
		}
		return disciplinePage.actions.find(action => action.id === modals.target) ?? null;
	});
	const editingAction = $derived(modals.active === 'edit' ? targetAction : null);
	const deleteTarget = $derived(modals.active === 'delete' ? targetAction : null);

	const kindOptions = $derived([
		{ value: 'all', label: $t('disciplinaryCatalog.filterAllKinds') },
		{ value: 'sanction', label: $t('disciplinaryCatalog.kindSanction') },
		{ value: 'reward', label: $t('disciplinaryCatalog.kindReward') },
	]);

	const filteredActions = $derived(
		disciplinePage.actions.filter((action) => {
			if (disciplinePage.filters.values.kind !== 'all' && action.kind !== disciplinePage.filters.values.kind) {
				return false;
			}
			const needle = disciplinePage.filters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return action.name.toLowerCase().includes(needle)
				|| (action.description?.toLowerCase().includes(needle) ?? false);
		}),
	);

	$effect(() => {
		if (!disciplinePage.filters.ready) {
			return;
		}
		void disciplinePage.filters.values.kind;
		disciplinePage.filters.scheduleSync();
	});

	$effect(() => {
		if (!modals.ready) {
			return;
		}
		if (modals.active === 'create') {
			if (modals.target !== null) {
				modals.open('create');
			}
			return;
		}
		if (
			(modals.active === 'edit' && !editingAction)
			|| (modals.active === 'delete' && !deleteTarget)
		) {
			modals.close();
		}
	});

	function openEdit(action: DisciplinaryActionCatalogItem) {
		modals.open('edit', { target: action.id });
	}

	function openDelete(action: DisciplinaryActionCatalogItem) {
		modals.open('delete', { target: action.id });
	}

	async function confirmDelete() {
		const target = deleteTarget;
		if (!target) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await disciplinePage.deleteAction({
				actionId: target.id,
				successMessage: get(t)('disciplinaryCatalog.toastDeleted', { name: target.name }),
			});
			if (ok) {
				deleteOpen.open = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader
		eyebrow={$t('disciplinaryCatalog.subtitle')}
		title={$t('disciplinaryCatalog.title', { n: filteredActions.length })}
	>
		{#snippet search()}
			<ListSearchField
				bind:value={disciplinePage.filters.values.q}
				oninput={() => disciplinePage.filters.scheduleSync()}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				bind:value={disciplinePage.filters.values.kind}
				options={kindOptions}
				class="h-9 min-w-[10rem]"
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="DISCIPLINE_VALIDATE">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('disciplinaryCatalog.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'disciplinary-catalog.csv',
					headers: ['name', 'kind', 'severity', 'description'],
					loadAll: async () => filteredActions.map(action => [
						action.name,
						action.kind,
						action.severity ?? '',
						action.description ?? '',
					]),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-4">{$t('disciplinaryCatalog.name')}</div>
			<div class="col-span-2">{$t('disciplinaryCatalog.kind')}</div>
			<div class="col-span-2">{$t('disciplinaryCatalog.severity')}</div>
			<div class="col-span-3">{$t('disciplinaryCatalog.description')}</div>
			<div class="col-span-1"></div>
		</div>
		<ul>
			{#if filteredActions.length === 0}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">
					{$t('dataState.emptyDescription')}
				</li>
			{:else}
				{#each filteredActions as action (action.id)}
					<li class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
						<div class="col-span-4 min-w-0">
							<p class="truncate text-sm font-medium">{action.name}</p>
							{#if action.defaultDurationDays}
								<p class="truncate text-xs text-muted-foreground">
									{$t('disciplinaryCatalog.durationDays', { n: action.defaultDurationDays })}
								</p>
							{/if}
						</div>
						<div class="col-span-2">
							<span
								class={cn(
									'rounded-full px-2 py-0.5 font-sans tabular-nums text-xs uppercase',
									action.kind === 'sanction'
										? 'bg-destructive/10 text-destructive'
										: 'bg-accent/15 text-accent-foreground',
								)}
							>
								{action.kind === 'sanction'
									? $t('disciplinaryCatalog.kindSanction')
									: $t('disciplinaryCatalog.kindReward')}
							</span>
						</div>
						<div class="col-span-2 text-sm tabular-nums text-muted-foreground">
							{action.severity ?? '—'}
						</div>
						<div class="col-span-3 truncate text-sm text-muted-foreground">
							{action.description ?? '—'}
						</div>
						<div class="col-span-1 flex justify-end">
							<PermissionGate permission="DISCIPLINE_VALIDATE">
								{#snippet children({ disabled, title })}
									<RowActionMenu>
										<RowActionMenuItem {disabled} {title} onclick={() => openEdit(action)}>
											<Pencil class="h-4 w-4" />
											{$t('common.edit')}
										</RowActionMenuItem>
										<RowActionMenuItem
											destructive
											{disabled}
											{title}
											onclick={() => openDelete(action)}
										>
											<Trash2 class="h-4 w-4" />
											{$t('common.delete')}
										</RowActionMenuItem>
									</RowActionMenu>
								{/snippet}
							</PermissionGate>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</div>
</div>

<DisciplinaryActionFormModal bind:open={createOpen.open} />
<DisciplinaryActionFormModal bind:open={editOpen.open} action={editingAction} />

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('disciplinaryCatalog.deleteConfirm', { name: deleteTarget?.name ?? '' })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
