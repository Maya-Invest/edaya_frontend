<script lang="ts">
	import type { Fee } from '$lib/types/school';
	import { page } from '$app/stores';
	import { deleteFeeMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, Plus, Trash2 } from '$lib/icons';
	import { readFeeListFilters, writeFeeListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { get } from 'svelte/store';
	import FeeFormModal from './FeeFormModal.svelte';
	import FinanceSubnav from './FinanceSubnav.svelte';

	const FEE_CATEGORIES: Fee['category'][] = ['Tuition', 'Transport', 'Meals', 'Activities', 'Materials'];

	const fees = $derived(detailDataContext.fees);
	const billing = $derived(detailDataContext.billing);
	const initialFilters = $derived(readFeeListFilters($page.url));

	let q = $state('');
	let category = $state('all');
	let filtersReady = $state(false);
	let createOpen = $state(false);
	let editOpen = $state(false);
	let editingFee = $state<Fee | null>(null);
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);
	let deleteTarget = $state<Fee | null>(null);

	const filteredFees = $derived(
		fees.filter((fee) => {
			if (category !== 'all' && fee.category !== category) {
				return false;
			}
			const needle = q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return fee.name.toLowerCase().includes(needle);
		}),
	);

	const categoryOptions = $derived([
		{ value: 'all', label: $t('filter.all') },
		...FEE_CATEGORIES.map(cat => ({ value: cat, label: $t(`feeCat.${cat}`) })),
	]);

	function usageCount(feeId: string): number {
		return billing.filter(row => row.feeId === feeId).length;
	}

	function periodKey(fee: Fee): string {
		const lower = fee.period.toLowerCase();
		return lower === 'year' || lower === 'term' || lower === 'month' ? lower : 'term';
	}

	function syncFiltersToUrl() {
		const href = writeFeeListFilters($page.url, { q, category });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		category = next.category;
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
		void category;
		scheduleFilterSync();
	});

	function openEdit(fee: Fee) {
		editingFee = fee;
		editOpen = true;
	}

	function openDelete(fee: Fee) {
		deleteTarget = fee;
		deleteOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTarget) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await deleteFeeMutation(deleteTarget.id, {
				navigate: false,
				successMessage: get(t)('fee.toastDeleted', { name: deleteTarget.name }),
			});
			if (ok) {
				deleteOpen = false;
				deleteTarget = null;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader eyebrow={$t('finance.feesCatalog')} title={$t('finance.fees')}>
		{#snippet search()}
			<ListSearchField bind:value={q} oninput={scheduleFilterSync} />
		{/snippet}
		{#snippet filters()}
			<div class="flex flex-wrap items-center gap-2">
				<FinanceSubnav active="fees" />
				<FilterSelect
					bind:value={category}
					options={categoryOptions}
					class="h-9 min-w-[10rem]"
				/>
			</div>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="FINANCIAL_CONFIG_CONFIGURE"
				mode="disable"
				tooltip={$t('fee.permissionConfigure')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('finance.newFee')}
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
			<div class="col-span-4">{$t('fee.name')}</div>
			<div class="col-span-2">{$t('fee.category')}</div>
			<div class="col-span-2">{$t('fee.period')}</div>
			<div class="col-span-2 text-right">{$t('fee.amount')}</div>
			<div class="col-span-1 text-right">{$t('finance.appliedTo')}</div>
			<div class="col-span-1"></div>
		</div>
		<ul>
			{#if filteredFees.length === 0}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">
					{$t('dataState.emptyDescription')}
				</li>
			{:else}
				{#each filteredFees as fee (fee.id)}
					<li class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
						<div class="col-span-4 min-w-0">
							<p class="truncate text-sm font-medium">{fee.name}</p>
						</div>
						<div class="col-span-2 text-sm text-foreground/70">
							{$t(`feeCat.${fee.category}`)}
						</div>
						<div class="col-span-2 text-sm text-foreground/70">
							{$t(`feePeriod.${periodKey(fee)}`)}
						</div>
						<div class="col-span-2 text-right font-display text-sm font-semibold tabular-nums">
							{fee.amount.toLocaleString()} FCFA
						</div>
						<div class="col-span-1 text-right text-xs text-muted-foreground">
							{usageCount(fee.id)}
						</div>
						<div class="col-span-1 flex justify-end">
							<PermissionGate permission="FINANCIAL_CONFIG_CONFIGURE">
								{#snippet children({ disabled, title })}
									<RowActionMenu>
										{#snippet children()}
											<RowActionMenuItem
												{disabled}
												{title}
												onclick={() => openEdit(fee)}
											>
												<Pencil class="h-4 w-4" />
												{$t('common.edit')}
											</RowActionMenuItem>
											<RowActionMenuItem
												destructive
												{disabled}
												{title}
												onclick={() => openDelete(fee)}
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
</div>

<FeeFormModal bind:open={createOpen} />
<FeeFormModal bind:open={editOpen} fee={editingFee ?? undefined} />

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('fee.deleteConfirm', { name: deleteTarget?.name ?? '' })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
