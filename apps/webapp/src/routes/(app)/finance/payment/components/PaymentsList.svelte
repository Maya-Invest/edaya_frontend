<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { billingFilters, readAllPayments } from '$lib/api/finance-workspace';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';

	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';

	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { downloadDocumentLabel } from '$lib/documents/titles';
	import { formatMinorUnits } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock, RotateCcw } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readPaymentListFilters, writePaymentListFilters } from '$lib/list/list-url-filters';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { hasPermission } from '$lib/permissions';
	import { untrack } from 'svelte';
	import RecordPaymentFormModal from '../../components/RecordPaymentFormModal.svelte';
	import { formatPaymentCivilDate } from '../lib/payment-helpers';
	import { getPaymentPageState } from '../payment-page.svelte';
	import RefundAvailableBalanceFormModal from './RefundAvailableBalanceFormModal.svelte';
	import ReversePaymentFormModal from './ReversePaymentFormModal.svelte';

	const paymentPage = getPaymentPageState();
	const students = $derived(paymentPage.students);
	const payments = $derived(paymentPage.payments);
	const classes = $derived(academicContext.classes);

	const initialFilters = $derived(readPaymentListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string; status: string; class: string }>(
		{
			getUrl: () => $page.url,
			write: writePaymentListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readPaymentListFilters($page.url),
	);

	const list = $derived(payments);

	const statusKeys = ['all', 'recorded', 'reversed'] as const;

	const classFilterOptions = $derived([
		{ value: 'all', label: $t('common.allClasses') },
		...classes.map(c => ({ value: c.id, label: c.name })),
	]);

	const statusFilterActive = $derived(listFilters.values.status !== 'all' ? 1 : 0);

	const statusFilterOptions = $derived(
		statusKeys.map(k => ({
			value: k,
			label: k === 'all' ? $t('filter.all') : $t(`payment.status.${k}`),
		})),
	);

	const modals = createUrlSyncedModals({
		allowed: () => [...(hasPermission('PAYMENT_RECORD') ? ['payment'] as const : []), ...(hasPermission('PAYMENT_REVERSE') ? ['reverse', 'refund'] as const : [])],
		owned: ['payment', 'reverse', 'refund'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const reverseOpen = bindUrlModal(modals, 'reverse');
	const refundOpen = bindUrlModal(modals, 'refund');
	const recordOpen = bindUrlModal(modals, 'payment');
	$effect(() => {
		if (refundOpen.open)
			untrack(() => void paymentPage.loadRefundContext());
	});
	const reverseTarget = $derived(modals.active === 'reverse' ? modals.target : null);

	$effect(() => {
		const next = initialFilters;
		listFilters.hydrate({
			q: next.q,
			status: (statusKeys.includes(next.status as (typeof statusKeys)[number])
				? next.status
				: 'all'),
			class: next.class,
		});
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.status;
		void listFilters.values.class;
		listFilters.scheduleSync();
	});
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader eyebrow={$t('finance.treasury')} title={$t('finance.payments')}>
		{#snippet search()}
			<ListSearchField bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
			<div class="flex flex-wrap items-center gap-2">
				<FilterSelect
					bind:value={listFilters.values.class}
					class="h-9 min-w-[10rem] rounded-full text-xs"
					options={classFilterOptions}
				/>
				<FilterPanel activeCount={statusFilterActive} title={$t('finance.paymentStatusFilter')}>
					<FilterSelect
						bind:value={listFilters.values.status}
						class="h-9 w-full rounded-md text-xs"
						options={statusFilterOptions}
					/>
				</FilterPanel>
			</div>
		{/snippet}

		{#snippet primary()}<PermissionGate permission="PAYMENT_RECORD"><Button size="sm" onclick={() => modals.open('payment')}>{$t('finance.recordPayment')}</Button></PermissionGate>{/snippet}
		{#snippet more()}
			<RowActionMenu>
				<RowActionMenuItem onclick={() => void exportMatchingList({ filename: 'payments.csv', headers: ['date', 'student', 'kind', 'method', 'amount', 'currency', 'status'], loadAll: async () => (await readAllPayments(billingFilters($page.url))).map(row => [row.paymentDate, row.studentName ?? row.studentId, row.kind, row.method, row.amount, row.currency, row.status]) })}>{$t('list.export')}</RowActionMenuItem>
				<PermissionGate permission="PAYMENT_REVERSE"><RowActionMenuItem onclick={() => modals.open('refund')}>{$t('payment.refund')}</RowActionMenuItem></PermissionGate>
			</RowActionMenu>
		{/snippet}
	</ListPageHeader>

	<ListEntityTable rows={list} columns={[{ key: 'date', label: $t('events.date'), span: 2 }, { key: 'student', label: $t('events.student'), span: 4 }, { key: 'kind', label: $t('payment.kindLabel'), span: 2 }, { key: 'amount', label: $t('payment.amount'), span: 2 }, { key: 'status', label: $t('students.status'), span: 2 }]} total={paymentPage.slice?.total ?? 0} visibleCount={list.length} hasMore={list.length < (paymentPage.slice?.total ?? 0)} loadingMore={paymentPage.loadingMore} onLoadMore={() => void paymentPage.loadMore()}>
		{#snippet row(payment)}
			{@const student = students.find(entry => entry.id === payment.studentId)}
			<div class="col-span-2 font-sans tabular-nums text-xs text-muted-foreground">
				{formatPaymentCivilDate(payment.paymentDate, $locale)}
			</div>
			<div class="col-span-4 text-sm font-medium">{payment.studentName || student?.name || payment.studentId}</div>
			<div class="col-span-2 min-w-0">
				<p class="truncate text-sm text-foreground/70">
					{$t(`payment.kind.${payment.kind}`)}
				</p>
				<p class="truncate font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
					{$t(`payment.method.${payment.method}`)}
				</p>
			</div>
			<div class="col-span-2 text-right font-sans text-sm font-semibold tabular-nums">
				{formatMinorUnits(payment.amount, payment.currency, $locale)}
			</div>
			<div class="col-span-2 flex items-center justify-end gap-1">
				{#if payment.status === 'reversed'}
					<span
						class="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
					>
						<Clock class="h-3 w-3" />
						{$t('payment.status.reversed')}
					</span>
				{:else}
					<span
						class="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
					>
						<Check class="h-3 w-3" />
						{$t('payment.status.recorded')}
					</span>
				{/if}
				{#if payment.status === 'recorded'}
					<RowActionMenu>
						<PermissionGate permission="PAYMENT_READ">
							{#snippet children({ disabled, title })}
								{#if payment.kind === 'receipt'}
									<RowActionMenuItem
										{disabled}
										{title}
										onclick={() => void paymentPage.performRequestDocumentIssuance({
											templateKey: 'receipt.v1',
											sourceId: payment.id,
											studentId: payment.studentId,
											successMessage: $t('documents.toastRequested'),
										})}
									>
										{downloadDocumentLabel($t, 'receipt.v1')}
									</RowActionMenuItem>{#if payment.hasActiveAllocations}
										<RowActionMenuItem
											{disabled}
											{title}
											onclick={() => void paymentPage.performRequestDocumentIssuance({
												templateKey: 'settlement-quittance.v1',
												sourceId: payment.id,
												studentId: payment.studentId,
												successMessage: $t('documents.toastRequested'),
											})}
										>
											{downloadDocumentLabel($t, 'settlement-quittance.v1')}
										</RowActionMenuItem>{/if}
								{/if}
							{/snippet}
						</PermissionGate>
						{#if payment.kind === 'receipt'}<PermissionGate permission="PAYMENT_REVERSE" studentId={payment.studentId} classId={payment.classId}>
							{#snippet children({ disabled, title })}
								<RowActionMenuItem
									destructive
									{disabled}
									{title}
									onclick={() => modals.open('reverse', { target: payment.id })}
								>
									<RotateCcw class="h-4 w-4" />
									{$t('payment.reverse')}
								</RowActionMenuItem>
							{/snippet}
						</PermissionGate>{/if}
					</RowActionMenu>
				{/if}
			</div>
		{/snippet}
	</ListEntityTable>
	{#if paymentPage.moreError}<Button variant="outline" onclick={() => paymentPage.loadMore()}>{$t('dataState.retry')}</Button>{/if}
</div>

{#if reverseOpen.open}
	<ReversePaymentFormModal bind:open={reverseOpen.open} paymentId={reverseTarget ?? ''} />
{/if}
{#if refundOpen.open && !paymentPage.refundLoading}
	<RefundAvailableBalanceFormModal bind:open={refundOpen.open} />
{/if}

{#if recordOpen.open}<RecordPaymentFormModal bind:open={recordOpen.open} draft={paymentPage.paymentDraft} onSuccess={() => paymentPage.refreshSlice()} />{/if}
