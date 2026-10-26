<script lang="ts">
	import type { FeeListFilters } from '$lib/list/list-url-filters';
	import type { Fee } from '$lib/types/school';
	import { page } from '$app/stores';
	import { CATALOG_CATEGORIES } from '$lib/api/finance-types';
	import { financeReadKey } from '$lib/api/finance-workspace';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { formatMinorUnits } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { Check, Pencil, Plus, XCircle } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readFeeListFilters, writeFeeListFilters } from '$lib/list/list-url-filters';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { hasPermission } from '$lib/permissions';
	import { untrack } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import { get } from 'svelte/store';
	import FinanceOverview from '../../components/FinanceOverview.svelte';
	import { getFeesPageState } from '../fees-page.svelte';
	import FeeFormModal from './FeeFormModal.svelte';

	const feesPage = getFeesPageState();
	const catalogQuery = feesPage.queryListPage();
	const overviewQuery = feesPage.queryOverview();
	let visibleCount = $state(50);
	function selectFee(id: string) {
		const url = new SvelteURL($page.url);
		url.pathname = `/finance/fees/${encodeURIComponent(id)}`;
		url.searchParams.delete('modal');
		url.searchParams.delete('modalTarget');
		openDetailDrawer(url.pathname + url.search, $page.url.pathname + $page.url.search);
	}
	const fees = $derived(feesPage.fees);
	const initialFilters = $derived(readFeeListFilters($page.url));
	const listFilters = new ListFiltersState<FeeListFilters>({
		getUrl: () => $page.url,
		write: writeFeeListFilters,
		goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
	}, () => readFeeListFilters($page.url));
	const statusFilter = $derived(listFilters.values.status);
	const modals = createUrlSyncedModals({
		allowed: () => hasPermission('FINANCIAL_CATALOG_MANAGE') ? ['create', 'edit', 'archive', 'activate'] as const : [],
		owned: ['create', 'edit', 'archive', 'activate'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const editOpen = bindUrlModal(modals, 'edit');
	const activateOpen = bindUrlModal(modals, 'activate');
	const activationTarget = $derived(modals.active === 'activate' && modals.target ? feesPage.feeFor(modals.target) : undefined);
	const archiveOpen = bindUrlModal(modals, 'archive');
	let archiveBusy = $state(false);
	const editingFee = $derived(modals.active === 'edit' && modals.target ? feesPage.feeFor(modals.target) ?? null : null);
	const archiveTarget = $derived(modals.active === 'archive' && modals.target ? feesPage.feeFor(modals.target) ?? null : null);
	const filteredFees = $derived(fees.filter((fee) => {
		if (statusFilter !== 'all' && fee.status !== statusFilter)
			return false;
		if (listFilters.values.category !== 'all' && fee.category !== listFilters.values.category) {
			return false;
		}
		const needle = listFilters.values.q.trim().toLowerCase();
		if (!needle) {
			return true;
		}
		return fee.name.toLowerCase().includes(needle);
	}));
	const categoryOptions = $derived([
		{ value: 'all', label: $t('filter.all') },
		...CATALOG_CATEGORIES.map(cat => ({ value: cat, label: $t(`feeCat.${cat}`) })),
	]);
	$effect(() => {
		listFilters.hydrate(initialFilters);
	});
	$effect(() => {
		if (!modals.ready || !modals.target || !['edit', 'archive', 'activate'].includes(modals.active ?? ''))
			return;
		if (!$page.params.feeId) {
			const currentUrl = $page.url;
			const target = modals.target;
			untrack(() => {
				const url = new SvelteURL(currentUrl);
				url.pathname = `/finance/fees/${encodeURIComponent(target)}`;
				void appGoto(url.pathname + url.search, { replaceState: true });
			});
		}
	});
	function openEdit(fee: Fee) {
		const url = new SvelteURL($page.url);
		url.pathname = `/finance/fees/${encodeURIComponent(fee.id)}`;
		url.searchParams.set('modal', 'edit');
		url.searchParams.set('modalTarget', fee.id);
		openDetailDrawer(url.pathname + url.search, $page.url.pathname + $page.url.search);
	}
	function openArchive(fee: Fee) {
		const url = new SvelteURL($page.url);
		url.pathname = `/finance/fees/${encodeURIComponent(fee.id)}`;
		url.searchParams.set('modal', 'archive');
		url.searchParams.set('modalTarget', fee.id);
		openDetailDrawer(url.pathname + url.search, $page.url.pathname + $page.url.search);
	}
	async function confirmArchive() {
		const target = archiveTarget;
		if (archiveBusy || !target || target.status !== 'active' || !hasPermission('FINANCIAL_CATALOG_MANAGE')) {
			return;
		}
		archiveBusy = true;
		try {
			const ok = await feesPage.archiveFee({
				feeId: target.id,
				successMessage: get(t)('fee.toastArchived', { name: target.name }),
			});
			if (ok) {
				archiveOpen.open = false;
			}
		}
		finally {
			archiveBusy = false;
		}
	}
	function activateFee(fee: Fee) {
		const url = new SvelteURL($page.url);
		url.pathname = `/finance/fees/${encodeURIComponent(fee.id)}`;
		url.searchParams.set('modal', 'activate');
		url.searchParams.set('modalTarget', fee.id);
		openDetailDrawer(url.pathname + url.search, $page.url.pathname + $page.url.search);
	}
	async function confirmActivate() {
		const fee = activationTarget;
		if (archiveBusy || !fee || fee.status === 'active' || !hasPermission('FINANCIAL_CATALOG_MANAGE'))
			return;
		archiveBusy = true;
		try {
			if (await feesPage.activateFee({ feeId: fee.id, successMessage: $t('fee.toastActivated', { name: fee.name }) }))
				activateOpen.open = false;
		}
		finally {
			archiveBusy = false;
		}
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader
		filterCount={[listFilters.values.category, listFilters.values.status].filter(value => value !== 'all').length}
		onResetFilters={() => listFilters.patchImmediate({ category: 'all', status: 'all' })} eyebrow={$t('finance.feesCatalog')} title={$t('finance.fees')}>
		{#snippet search()}
			<ListSearchField onCommit={() => listFilters.syncNow()} bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
			<FilterPanel activeCount={Number(listFilters.values.category !== 'all') + Number(statusFilter !== 'all')}>
				<label class="block space-y-2 text-sm">
					<span>{$t('fee.category')}</span>
					<FilterSelect aria-label={$t('fee.category')} value={listFilters.values.category} onchange={value => listFilters.patchImmediate({ category: value })} options={categoryOptions} class="w-full" />
				</label>
				<label class="block space-y-2 text-sm">
					<span>{$t('fee.status')}</span>
					<FilterSelect aria-label={$t('fee.status')} value={statusFilter} options={['all', 'active', 'draft', 'archived'].map(value => ({ value, label: value === 'all' ? $t('filter.all') : $t(`fee.status.${value}`) }))} class="w-full" onchange={value => listFilters.patchImmediate({ status: value })} />
				</label>
			</FilterPanel>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="FINANCIAL_CATALOG_MANAGE"
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
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'fees.csv',
					headers: ['name', 'category', 'status', 'amount', 'currency'],
					loadAll: async () => filteredFees.map(fee => [
						fee.name,
						fee.category,
						fee.status,
						fee.amount,
						fee.currency,
					]),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	{#if hasPermission('PAYMENT_READ')}
		<PageQuery query={overviewQuery} cacheKey={() => financeReadKey('overview')} cache={false}>
			{#snippet children(data)}
				<DataState status={data.status} errorMessage={data.errorMessage}>
					{#if data.overview}<FinanceOverview overview={data.overview} />{/if}
				</DataState>
			{/snippet}
		</PageQuery>
	{/if}
	<PageQuery query={catalogQuery} cache={false} cacheKey={() => financeReadKey('fee-catalog')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage} preserveShell>
				<ListEntityTable listKey="FeesList" rows={filteredFees.slice(0, visibleCount)} columns={[
					{ key: 'name', label: $t('fee.name'), span: 3 },
					{ key: 'category', label: $t('fee.category'), span: 2 },
					{ key: 'status', label: $t('fee.status'), span: 2 },
					{ key: 'amount', label: $t('fee.amount'), span: 2 },
					{ key: 'autoBilling', label: $t('fee.autoBilling'), span: 2 },
					{ key: 'actions', label: '', span: 1 },
				]} total={filteredFees.length} visibleCount={Math.min(visibleCount, filteredFees.length)} hasMore={visibleCount < filteredFees.length} onLoadMore={() => { visibleCount += 50; }} onRowClick={fee => selectFee(fee.id)}>
					{#snippet cell(fee, column, _ctx)}

						{#if column.key === 'name'}
							<div class="col-span-3 min-w-0">
								<p class="truncate text-sm font-medium">{fee.name}</p>
							</div>
						{:else if column.key === 'autoBilling'}
							<div class="col-span-2 text-sm">{$t(`fee.autoBilling.${fee.autoBilling.mode}`)}</div>
						{:else if column.key === 'category'}
							<div class="col-span-2 text-sm text-foreground/70">
								{$t(`feeCat.${fee.category}`)}
							</div>
						{:else if column.key === 'status'}
							<div class="col-span-2 text-sm text-foreground/70">
								{$t(`fee.status.${fee.status}`)}
							</div>
						{:else if column.key === 'amount'}
							<div class="col-span-2 text-right font-sans text-sm font-semibold tabular-nums">
								{formatMinorUnits(fee.amount, fee.currency, $locale)}
							</div>
						{:else if column.key === 'actions'}
							<div class="col-span-1 flex justify-end" role="presentation" onclick={event => event.stopPropagation()} onkeydown={event => event.stopPropagation()}>
								<PermissionGate permission="FINANCIAL_CATALOG_MANAGE">
									{#snippet children({ disabled, title })}
										<RowActionMenu>
											<RowActionMenuItem {disabled} {title} onclick={() => openEdit(fee)}>
												<Pencil class="h-4 w-4" />
												{$t('common.edit')}
											</RowActionMenuItem>
											{#if fee.status !== 'active'}
												<RowActionMenuItem {disabled} {title} onclick={() => void activateFee(fee)}>
													<Check class="h-4 w-4" />
													{$t('fee.activate')}
												</RowActionMenuItem>
											{/if}
											{#if fee.status === 'active'}
												<RowActionMenuItem destructive {disabled} {title} onclick={() => openArchive(fee)}>
													<XCircle class="h-4 w-4" />
													{$t('fee.archive')}
												</RowActionMenuItem>
											{/if}
										</RowActionMenu>
									{/snippet}
								</PermissionGate>
							</div>
						{/if}
					{/snippet}
				</ListEntityTable>
			</DataState>
		{/snippet}
	</PageQuery>
</div>

<FeeFormModal bind:open={createOpen.open} onCreated={selectFee} />
{#if editingFee}<FeeFormModal bind:open={editOpen.open} fee={editingFee} />{/if}

<ConfirmModal
	bind:open={archiveOpen.open}
	title={$t('fee.archiveTitle')}
	description={$t('fee.archiveConfirm', { name: archiveTarget?.name ?? '' })}
	confirmLabel={$t('fee.archive')}
	cancelLabel={$t('common.cancel')}
	busy={archiveBusy}
	onConfirm={confirmArchive}
/>

<ConfirmModal bind:open={activateOpen.open} title={$t('fee.activate')} description={$t('finance.activateConfirm', { name: activationTarget?.name ?? '' })} confirmLabel={$t('fee.activate')} busy={archiveBusy} onConfirm={confirmActivate} />
