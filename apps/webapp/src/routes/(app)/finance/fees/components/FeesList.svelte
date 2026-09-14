<script lang="ts">
	import type { Fee } from '$lib/types/school';
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
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readFeeListFilters, writeFeeListFilters } from '$lib/list/list-url-filters';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { get } from 'svelte/store';
	import FinanceSubnav from '../../components/FinanceSubnav.svelte';
	import { getFeesPageState } from '../fees-page.svelte';
	import FeeFormModal from './FeeFormModal.svelte';

	const FEE_CATEGORIES: Fee['category'][] = ['Tuition', 'Transport', 'Materials', 'Other'];

	const feesPage = getFeesPageState();
	const fees = $derived(feesPage.fees);
	const initialFilters = $derived(readFeeListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string; category: string }>(
		{
			getUrl: () => $page.url,
			write: writeFeeListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readFeeListFilters($page.url),
	);

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

	const editingFee = $derived(
		modals.active === 'edit' && modals.target ? feesPage.feeFor(modals.target) ?? null : null,
	);
	const deleteTarget = $derived(
		modals.active === 'delete' && modals.target ? feesPage.feeFor(modals.target) ?? null : null,
	);

	const filteredFees = $derived(
		fees.filter((fee) => {
			if (listFilters.values.category !== 'all' && fee.category !== listFilters.values.category) {
				return false;
			}
			const needle = listFilters.values.q.trim().toLowerCase();
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

	function periodKey(period: NonNullable<Fee['period']>): string {
		const lower = period.toLowerCase();
		return lower === 'year' || lower === 'term' || lower === 'month' ? lower : 'term';
	}

	$effect(() => {
		listFilters.hydrate(initialFilters);
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.category;
		listFilters.scheduleSync();
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
			(modals.active === 'edit' && !editingFee)
			|| (modals.active === 'delete' && !deleteTarget)
		) {
			modals.close();
		}
	});

	function openEdit(fee: Fee) {
		modals.open('edit', { target: fee.id });
	}

	function openDelete(fee: Fee) {
		modals.open('delete', { target: fee.id });
	}

	async function confirmDelete() {
		const target = deleteTarget;
		if (!target) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await feesPage.deleteFee({
				feeId: target.id,
				successMessage: get(t)('fee.toastDeleted', { name: target.name }),
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
	<ListPageHeader eyebrow={$t('finance.feesCatalog')} title={$t('finance.fees')}>
		{#snippet search()}
			<ListSearchField bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
			<div class="flex flex-wrap items-center gap-2">
				<FinanceSubnav active="fees" />
				<FilterSelect
					bind:value={listFilters.values.category}
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
						onclick={() => modals.open('create')}
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
							{fee.period
								? $t(`feePeriod.${periodKey(fee.period)}`)
								: $t('fee.installmentCount', { n: fee.installmentCount ?? 0 })}
						</div>
						<div class="col-span-2 text-right font-sans text-sm font-semibold tabular-nums">
							{fee.amount.toLocaleString()} FCFA
						</div>
						<div class="col-span-1 text-right text-xs text-muted-foreground">
							{feesPage.usageCount(fee.id)}
						</div>
						<div class="col-span-1 flex justify-end">
							<PermissionGate permission="FINANCIAL_CONFIG_CONFIGURE">
								{#snippet children({ disabled, title })}
									<RowActionMenu>
										<RowActionMenuItem {disabled} {title} onclick={() => openEdit(fee)}>
											<Pencil class="h-4 w-4" />
											{$t('common.edit')}
										</RowActionMenuItem>
										<RowActionMenuItem destructive {disabled} {title} onclick={() => openDelete(fee)}>
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

<FeeFormModal bind:open={createOpen.open} />
<FeeFormModal bind:open={editOpen.open} fee={editingFee ?? undefined} />

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('fee.deleteConfirm', { name: deleteTarget?.name ?? '' })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
