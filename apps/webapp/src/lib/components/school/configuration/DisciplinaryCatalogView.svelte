<script lang="ts">
	import type { DisciplinaryActionCatalogItem } from '$lib/types/discipline';
	import { page } from '$app/stores';
	import { deleteDisciplinaryActionMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { disciplineCatalogContext } from '$lib/discipline-catalog/context.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, Pencil, Plus, Trash2 } from '$lib/icons';
	import {
		readDisciplineCatalogListFilters,
		writeDisciplineCatalogListFilters,
	} from '$lib/list/list-url-filters';
	import { refreshDisciplineCatalog } from '$lib/queries/discipline-catalog.queries';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DisciplinaryActionFormModal from './DisciplinaryActionFormModal.svelte';

	const initialFilters = $derived(readDisciplineCatalogListFilters($page.url));

	let q = $state('');
	let kind = $state('all');
	let filtersReady = $state(false);
	let createOpen = $state(false);
	let editOpen = $state(false);
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
		disciplineCatalogContext.actions.filter((action) => {
			if (kind !== 'all' && action.kind !== kind) {
				return false;
			}
			const needle = q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return action.name.toLowerCase().includes(needle)
				|| (action.description?.toLowerCase().includes(needle) ?? false);
		}),
	);

	function syncFiltersToUrl() {
		const href = writeDisciplineCatalogListFilters($page.url, { q, kind });
		const current = `${$page.url.pathname}${$page.url.search}`;
		if (href === current) {
			return;
		}
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		kind = next.kind;
		filtersReady = true;
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady) {
			return;
		}
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}

	$effect(() => {
		if (!filtersReady) {
			return;
		}
		void kind;
		scheduleFilterSync();
	});

	let catalogLoading = $state(!disciplineCatalogContext.ready);
	let catalogError = $state<string | null>(null);

	$effect(() => {
		if (disciplineCatalogContext.ready) {
			catalogLoading = false;
			return;
		}

		catalogLoading = true;
		catalogError = null;

		let cancelled = false;
		void refreshDisciplineCatalog()
			.catch(() => {
				if (!cancelled) {
					catalogError = get(t)('dataState.errorDefault');
					disciplineCatalogContext.hydrate([]);
				}
			})
			.finally(() => {
				if (!cancelled) {
					catalogLoading = false;
				}
			});

		return () => {
			cancelled = true;
		};
	});

	function openEdit(action: DisciplinaryActionCatalogItem) {
		editingAction = action;
		editOpen = true;
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
			const ok = await deleteDisciplinaryActionMutation(deleteTargetId, {
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
			<ListSearchField bind:value={q} oninput={scheduleFilterSync} />
		{/snippet}
		{#snippet filters()}
			<FilterSelect bind:value={kind} options={kindOptions} class="h-9 min-w-[10rem]" />
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="DISCIPLINE_VALIDATE">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('disciplinaryCatalog.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	{#if catalogLoading}
		<div class="flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card">
			<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
			<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
		</div>
	{:else if catalogError}
		<div class="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-8 text-center text-sm text-destructive">
			{catalogError}
		</div>
	{:else}
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
										{#snippet children()}
											<RowActionMenuItem
												{disabled}
												{title}
												onclick={() => openEdit(action)}
											>
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
										{/snippet}
									</RowActionMenu>
								{/snippet}
							</PermissionGate>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</div>
	{/if}
</div>

<DisciplinaryActionFormModal bind:open={createOpen} />
<DisciplinaryActionFormModal bind:open={editOpen} action={editingAction} />

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('disciplinaryCatalog.deleteConfirm', { name: deleteTargetName })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
