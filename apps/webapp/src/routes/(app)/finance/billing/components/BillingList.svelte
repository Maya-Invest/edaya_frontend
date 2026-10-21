<script lang="ts">
	import type { StudentBilling } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { studentYearAccountSourceId } from '$lib/api/documents-data';
	import { billingFilters, readAllBilling } from '$lib/api/finance-workspace';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { formatMinorUnits } from '$lib/finance/money';
	import { billingStatusTone } from '$lib/finance/status';
	import { locale, t } from '$lib/i18n';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { hasPermission } from '$lib/permissions';
	import { getBillingPageState } from '../billing-page.svelte';
	import AssignFeeFormModal from './AssignFeeFormModal.svelte';

	const { onSelectBilling, selectedId }: {
		onSelectBilling?: (billing: StudentBilling) => void;
		selectedId?: string;
	} = $props();
	const billingPage = getBillingPageState();
	const listFilters = $derived(billingFilters($page.url));
	let searchText = $derived($page.url.searchParams.get('q') ?? '');
	function filter(key: string, value: string) {
		const url = new URL($page.url);
		value && value !== 'all' ? url.searchParams.set(key, value) : url.searchParams.delete(key);
		appGoto(url.pathname + url.search, { replaceState: true, keepFocus: true, noScroll: true });
	}
	const modals = createUrlSyncedModals({ allowed: () => hasPermission('PAYMENT_RECORD') ? ['assign-fee'] as const : [], owned: ['assign-fee'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const assign = bindUrlModal(modals, 'assign-fee');
	function created(id: string) {
		openDetailDrawer(`/finance/billing/${encodeURIComponent(id)}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
	async function reminders() {
		const schoolId = authSession.schoolId;
		if (!schoolId)
			return;
		const rows = await readAllBilling({ ...listFilters, due: 'overdue' });
		const accounts = [...new Map(rows.map(row => [`${row.studentId}|${row.academicYearId}`, row])).values()];
		if (!accounts.length)
			return;
		await billingPage.performRequestDocumentIssuanceBatch({ templateKey: 'payment-reminder.v1', items: accounts.map(row => ({ sourceId: studentYearAccountSourceId({ schoolId, studentId: row.studentId, academicYearId: row.academicYearId, currency: row.currency }), studentId: row.studentId, requestId: crypto.randomUUID() })), successMessage: $t('documents.toastRequested') });
	}
	function exportRows() {
		return exportMatchingList({ filename: 'billing.csv', headers: ['student', 'fee', 'net', 'applied', 'remaining', 'currency', 'due', 'status'], loadAll: async () => (await readAllBilling(listFilters)).map(row => [row.studentName ?? row.studentId, row.label, row.netAmount ?? row.total, row.paid, row.remaining, row.currency, row.dueDate, row.status]) });
	}
</script>
<div class="space-y-6">
	<ListPageHeader eyebrow={$t('finance.financeEyebrow')} title={$t('finance.billing')}>
		{#snippet search()}<ListSearchField bind:value={searchText} oninput={() => filter('q', searchText)} />{/snippet}
		{#snippet filters()}
			<div class="flex flex-wrap gap-2">
				<FilterSelect value={listFilters.classGroupId ?? 'all'} options={[{ value: 'all', label: $t('common.allClasses') }, ...academicContext.classes.map(row => ({ value: row.id, label: row.name }))]} onchange={value => filter('class', value)} />
				<FilterPanel title={$t('finance.billingFilters')} activeCount={[listFilters.feeId, listFilters.status, listFilters.due, listFilters.dueFrom, listFilters.dueTo].filter(Boolean).length}>
					<FilterSelect aria-label={$t('billing.fee')} value={listFilters.feeId ?? 'all'} options={[{ value: 'all', label: $t('finance.allFees') }, ...billingPage.fees.map(row => ({ value: row.id, label: row.name }))]} onchange={value => filter('fee', value)} />
					<FilterSelect aria-label={$t('students.status')} value={listFilters.status ?? 'all'} options={['all', 'pending', 'partial', 'paid', 'overdue', 'waived', 'cancelled'].map(value => ({ value, label: value === 'all' ? $t('filter.all') : $t(`billing.status.${value}`) }))} onchange={value => filter('status', value)} />
					<FilterSelect aria-label={$t('billing.due')} value={listFilters.due ?? 'all'} options={['all', 'outstanding', 'overdue'].map(value => ({ value, label: value === 'all' ? $t('filter.all') : $t(`finance.${value}`) }))} onchange={value => filter('due', value)} />
					<label class="block space-y-2 text-sm">{$t('finance.dueFrom')}<Input type="date" value={listFilters.dueFrom ?? ''} max={listFilters.dueTo} oninput={event => filter('dueFrom', event.currentTarget.value)} /></label>
					<label class="block space-y-2 text-sm">{$t('finance.dueTo')}<Input type="date" value={listFilters.dueTo ?? ''} min={listFilters.dueFrom} oninput={event => filter('dueTo', event.currentTarget.value)} /></label>
				</FilterPanel>
			</div>
		{/snippet}
		{#snippet primary()}<PermissionGate permission="PAYMENT_RECORD"><Button size="sm" onclick={() => modals.open('assign-fee')}>{$t('finance.newInvoice')}</Button></PermissionGate>{/snippet}
		{#snippet more()}<RowActionMenu><RowActionMenuItem onclick={() => void exportRows()}>{$t('list.export')}</RowActionMenuItem><RowActionMenuItem onclick={() => void reminders()}>{$t('documents.exportReminders')}</RowActionMenuItem></RowActionMenu>{/snippet}
	</ListPageHeader>
	<ListEntityTable listKey="BillingList" rows={billingPage.billing} highlightId={selectedId} columns={[
		{ key: 'student', label: $t('events.student'), span: 2, sortable: true },
		{ key: 'label', label: $t('billing.fee'), span: 2, sortable: true },
		{ key: 'net', label: $t('finance.netBilled'), span: 1, sortable: true },
		{ key: 'applied', label: $t('finance.applied'), span: 1, sortable: true },
		{ key: 'remaining', label: $t('finance.remaining'), span: 2, sortable: true },
		{ key: 'dueDate', label: $t('billing.due'), span: 2, sortable: true },
		{ key: 'status', label: $t('students.status'), span: 1, sortable: true },
		{ key: 'actions', label: '', span: 1 },
	]} sort={{ column: listFilters.sort ?? 'dueDate', dir: listFilters.direction === 'asc' ? 'asc' : 'desc' }} onSort={(column) => {
		const url = new URL($page.url);
		url.searchParams.set('sort', column);
		url.searchParams.set('direction', listFilters.sort === column && listFilters.direction === 'asc' ? 'desc' : 'asc');
		appGoto(url.pathname + url.search, { replaceState: true });
	}} onRowClick={row => onSelectBilling?.(row)} total={billingPage.slice?.total ?? 0} visibleCount={billingPage.billing.length} hasMore={billingPage.billing.length < (billingPage.slice?.total ?? 0)} loadingMore={billingPage.loadingMore} onLoadMore={() => void billingPage.loadMore()}>
		{#snippet cell(row, column, _ctx)}

			{#if column.key === 'student'}
				<div class="col-span-2 min-w-0 truncate text-sm font-medium">{row.studentName ?? row.studentId}</div>
			{:else if column.key === 'label'}
				<div class="col-span-2 min-w-0 truncate text-sm">{row.label}</div>
			{:else if column.key === 'net'}
				<div class="col-span-1 break-words text-xs tabular-nums">{formatMinorUnits(row.netAmount ?? row.total, row.currency, $locale)}</div>
			{:else if column.key === 'applied'}
				<div class="col-span-1 break-words text-xs tabular-nums">{formatMinorUnits(row.paid, row.currency, $locale)}</div>
			{:else if column.key === 'remaining'}
				<div class="col-span-2 break-words text-sm font-medium tabular-nums">{formatMinorUnits(row.remaining, row.currency, $locale)}</div>
			{:else if column.key === 'dueDate'}
				<div class="col-span-2 text-xs">{row.dueDate || '—'}</div>
			{:else if column.key === 'status'}
				<div class="col-span-1"><span class={`rounded-full px-2 py-1 text-xs ${billingStatusTone[row.status]}`}>{$t(`billing.status.${row.status}`)}</span></div>
			{:else if column.key === 'actions'}
				<div class="col-span-1" role="presentation" onclick={event => event.stopPropagation()} onkeydown={event => event.stopPropagation()}><RowActionMenu><RowActionMenuItem onclick={() => onSelectBilling?.(row)}>{$t('common.open')}</RowActionMenuItem></RowActionMenu></div>
			{/if}
		{/snippet}
	</ListEntityTable>
	{#if billingPage.moreError}<Button variant="outline" onclick={() => billingPage.loadMore()}>{$t('dataState.retry')}</Button>{/if}
</div>
<AssignFeeFormModal bind:open={assign.open} onCreated={created} />
