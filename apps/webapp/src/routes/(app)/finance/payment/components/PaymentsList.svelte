<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { downloadDocumentLabel } from '$lib/documents/titles';
	import { formatMinorUnits } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock, RotateCcw, Wallet } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readPaymentListFilters, writePaymentListFilters } from '$lib/list/list-url-filters';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import FinanceSubnav from '../../components/FinanceSubnav.svelte';
	import { collectedTotalsByCurrency, formatPaymentCivilDate } from '../lib/payment-helpers';
	import { getPaymentPageState } from '../payment-page.svelte';
	import RefundAvailableBalanceFormModal from './RefundAvailableBalanceFormModal.svelte';
	import ReversePaymentFormModal from './ReversePaymentFormModal.svelte';

	const paymentPage = getPaymentPageState();
	const students = $derived(paymentPage.students);
	const payments = $derived(paymentPage.payments);
	const classes = $derived(academicContext.classes);
	const fallbackCurrency = $derived(authSession.school?.financeCurrency ?? '');

	const initialFilters = $derived(readPaymentListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string; status: string; class: string }>(
		{
			getUrl: () => $page.url,
			write: writePaymentListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readPaymentListFilters($page.url),
	);

	const list = $derived(
		payments.filter((payment) => {
			if (payment.status !== 'recorded' && payment.status !== 'reversed') {
				return false;
			}
			const student = students.find(entry => entry.id === payment.studentId);
			if (listFilters.values.status !== 'all' && payment.status !== listFilters.values.status) {
				return false;
			}
			if (listFilters.values.class !== 'all') {
				if (!student || student.classId !== listFilters.values.class) {
					return false;
				}
			}
			if (listFilters.values.q) {
				if (!student || !student.name.toLowerCase().includes(listFilters.values.q.toLowerCase())) {
					return false;
				}
			}
			return true;
		}),
	);

	const collectedByCurrency = $derived(collectedTotalsByCurrency(list));

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
		allowed: ['reverse', 'refund'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const reverseOpen = bindUrlModal(modals, 'reverse');
	const refundOpen = bindUrlModal(modals, 'refund');
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
				<FinanceSubnav active="payment" />
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
		{#snippet primary()}
			<PermissionGate
				permission="PAYMENT_REVERSE"
				mode="disable"
				tooltip={$t('payment.permissionRefund')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (refundOpen.open = true)}
					>
						<Wallet class="mr-1 h-4 w-4" />
						{$t('payment.refund')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'payments.csv',
					headers: ['date', 'student', 'kind', 'method', 'amount', 'currency', 'status'],
					loadAll: async () => list.map((payment) => {
						const student = students.find(entry => entry.id === payment.studentId);
						return [
							payment.paymentDate,
							student?.name ?? '',
							payment.kind,
							payment.method,
							payment.amount,
							payment.currency,
							payment.status,
						];
					}),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	<div class="grid gap-3 sm:grid-cols-1">
		<div class="rounded-2xl border border-border bg-card p-5 shadow-soft">
			<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
				{$t('finance.collectedFiltered')}
			</p>
			<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
				{#if collectedByCurrency.length === 0}
					<p class="font-sans text-2xl font-semibold tabular-nums">
						{formatMinorUnits(0, fallbackCurrency, $locale)}
					</p>
				{:else}
					{#each collectedByCurrency as total (total.currency)}
						<p class="font-sans text-2xl font-semibold tabular-nums">
							{formatMinorUnits(total.amount, total.currency, $locale)}
						</p>
					{/each}
				{/if}
			</div>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-2">{$t('events.date')}</div>
			<div class="col-span-4">{$t('events.student')}</div>
			<div class="col-span-2">{$t('payment.kindLabel')}</div>
			<div class="col-span-2 text-right">{$t('payment.amount')}</div>
			<div class="col-span-2 text-right">{$t('students.status')}</div>
		</div>
		<ul>
			{#each list as payment (payment.id)}
				{@const student = students.find(entry => entry.id === payment.studentId)}
				<li data-payment-id={payment.id} class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-3 last:border-b-0">
					<div class="col-span-2 font-sans tabular-nums text-xs text-muted-foreground">
						{formatPaymentCivilDate(payment.paymentDate, $locale)}
					</div>
					<div class="col-span-4 text-sm font-medium">{student?.name ?? '—'}</div>
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
												onclick={() => void requestDocumentIssuanceMutation({
													templateKey: 'receipt.v1',
													sourceId: payment.id,
													studentId: payment.studentId,
													successMessage: $t('documents.toastRequested'),
												})}
											>
												{downloadDocumentLabel($t, 'receipt.v1')}
											</RowActionMenuItem>
											<RowActionMenuItem
												{disabled}
												{title}
												onclick={() => void requestDocumentIssuanceMutation({
													templateKey: 'settlement-quittance.v1',
													sourceId: payment.id,
													studentId: payment.studentId,
													successMessage: $t('documents.toastRequested'),
												})}
											>
												{downloadDocumentLabel($t, 'settlement-quittance.v1')}
											</RowActionMenuItem>
										{/if}
									{/snippet}
								</PermissionGate>
								<PermissionGate permission="PAYMENT_REVERSE">
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
								</PermissionGate>
							</RowActionMenu>
						{/if}
					</div>
				</li>
			{/each}
			{#if list.length === 0}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">
					{$t('finance.noPayments')}
				</li>
			{/if}
		</ul>
	</div>
</div>

{#if reverseOpen}
	<ReversePaymentFormModal bind:open={reverseOpen.open} paymentId={reverseTarget ?? ''} />
{/if}
{#if refundOpen}
	<RefundAvailableBalanceFormModal bind:open={refundOpen.open} />
{/if}
