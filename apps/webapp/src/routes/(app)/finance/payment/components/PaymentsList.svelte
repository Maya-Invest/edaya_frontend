<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { reversePaymentMutation, cancelPaymentMutation } from '$lib/api/mutations/billing.mutations';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock, Receipt, RotateCcw, XCircle } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readPaymentListFilters, writePaymentListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { get } from 'svelte/store';
	import { getPaymentPageState } from '../payment-page.svelte';

	const paymentPage = getPaymentPageState();
	const billing = $derived(paymentPage.billing);
	const students = $derived(paymentPage.students);
	const fees = $derived(paymentPage.fees);
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

	const list = $derived(
		payments.filter((payment) => {
			const bill = billing.find(entry => entry.id === payment.studentFeeId);
			const st = bill ? students.find(student => student.id === bill.studentId) : undefined;
			if (!st) {
				return false;
			}
			if (listFilters.values.status !== 'all' && payment.status !== listFilters.values.status) {
				return false;
			}
			if (listFilters.values.class !== 'all' && st.classId !== listFilters.values.class) {
				return false;
			}
			if (listFilters.values.q && !st.name.toLowerCase().includes(listFilters.values.q.toLowerCase())) {
				return false;
			}
			return true;
		}),
	);

	const collected = $derived(
		list
			.filter(payment => payment.status !== 'cancelled' && payment.status !== 'reversed')
			.reduce((sum, payment) => sum + payment.amount, 0),
	);

	const statusKeys = ['all', 'recorded', 'cancelled', 'reversed'] as const;

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

	function openBillingReceipt(billingId: string) {
		appGoto(detailHref.financeBilling(billingId));
	}

	async function reversePayment(paymentId: string) {
		const ok = await reversePaymentMutation({
			paymentId,
			successMessage: get(t)('payment.reverseSuccess'),
		});
		if (ok) {
			await paymentPage.refreshSlice();
		}
	}

	async function cancelPayment(paymentId: string) {
		const ok = await cancelPaymentMutation({
			paymentId,
			successMessage: get(t)('payment.cancelSuccess'),
		});
		if (ok) {
			await paymentPage.refreshSlice();
		}
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader eyebrow={$t('finance.treasury')} title={$t('finance.payments')}>
		{#snippet search()}
			<ListSearchField bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
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
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<div class="grid gap-3 sm:grid-cols-1">
		<div class="rounded-2xl border border-border bg-card p-5 shadow-soft">
			<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
				{$t('finance.collectedFiltered')}
			</p>
			<p class="mt-1 font-sans text-2xl font-semibold tabular-nums">
				{collected.toLocaleString()} FCFA
			</p>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-2">{$t('events.date')}</div>
			<div class="col-span-4">{$t('events.student')}</div>
			<div class="col-span-3">{$t('billing.fee')}</div>
			<div class="col-span-2 text-right">{$t('eval.average')}</div>
			<div class="col-span-1 text-right">{$t('students.status')}</div>
		</div>
		<ul>
			{#each list as payment (payment.id)}
				{@const bill = billing.find(entry => entry.id === payment.studentFeeId)}
				{@const st = bill ? students.find(student => student.id === bill.studentId) : undefined}
				{@const fee = bill ? fees.find(entry => entry.id === bill.feeId) : undefined}
				<li
					class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-3 last:border-b-0"
				>
					<div class="col-span-2 font-sans tabular-nums text-xs text-muted-foreground">
						{new Date(payment.paymentDate).toLocaleDateString($locale, {
							day: 'numeric',
							month: 'short',
							year: '2-digit',
						})}
					</div>
					<div class="col-span-4 text-sm font-medium">{st?.name ?? '—'}</div>
					<div class="col-span-3 text-sm text-foreground/70">{fee?.name ?? '—'}</div>
					<div class="col-span-2 text-right font-sans text-sm font-semibold tabular-nums">
						{payment.amount.toLocaleString()} FCFA
					</div>
					<div class="col-span-1 flex items-center justify-end gap-1">
						{#if payment.status === 'cancelled' || payment.status === 'reversed'}
							<span
								class="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
							>
								<Clock class="h-3 w-3" />
								{$t(`payment.status.${payment.status}`)}
							</span>
						{:else}
							<span
								class="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
							>
								<Check class="h-3 w-3" />
								{$t('payment.status.recorded')}
							</span>
						{/if}
						<PermissionGate permission="PAYMENT_RECORD">
							{#snippet children({ disabled, title })}
								<RowActionMenu>
									{#if bill}
										<RowActionMenuItem onclick={() => openBillingReceipt(bill.id)}>
											<Receipt class="h-4 w-4" />
											{$t('payment.viewReceipt')}
										</RowActionMenuItem>
									{/if}
									{#if payment.status !== 'reversed' && payment.status !== 'cancelled'}
										<RowActionMenuItem
											{disabled}
											{title}
											onclick={() => void reversePayment(payment.id)}
										>
											<RotateCcw class="h-4 w-4" />
											{$t('payment.reverse')}
										</RowActionMenuItem>
										<RowActionMenuItem
											destructive
											{disabled}
											{title}
											onclick={() => void cancelPayment(payment.id)}
										>
											<XCircle class="h-4 w-4" />
											{$t('payment.cancel')}
										</RowActionMenuItem>
									{/if}
								</RowActionMenu>
							{/snippet}
						</PermissionGate>
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
