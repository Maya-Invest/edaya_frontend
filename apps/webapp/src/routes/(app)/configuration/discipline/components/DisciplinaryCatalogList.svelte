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
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getDisciplinePageState } from '../discipline-page.svelte';
	import DisciplinaryActionFormModal from './DisciplinaryActionFormModal.svelte';

	const disciplinePage = getDisciplinePageState();

	const modals = createUrlSyncedModals({ allowed: ['create', 'edit'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const editOpen = bindUrlModal(modals, 'edit');

	let editingAction = $state<DisciplinaryActionCatalogItem | null>(null);
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);
	let deleteTargetId = $state<string | null>(null);
	let deleteTargetName = $state('');

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

	function openEdit(action: DisciplinaryActionCatalogItem) {
		editingAction = action;
		editOpen.open = true;
	}

	function openDelete(actionId: string, actionName: string) {
		deleteTargetId = actionId;
		deleteTargetName = actionName;
		deleteOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTargetId) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await disciplinePage.deleteAction({
				actionId: deleteTargetId,
				successMessage: get(t)('disciplinaryCatalog.toastDeleted', { name: deleteTargetName }),
			});
			if (ok) {
				deleteOpen = false;
				deleteTargetId = null;
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
						onclick={() => (createOpen.open = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('disciplinaryCatalog.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
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
									'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase',
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
											onclick={() => openDelete(action.id, action.name)}
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
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('disciplinaryCatalog.deleteConfirm', { name: deleteTargetName })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
