<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock, Receipt } from '$lib/icons';
	import { readPaymentListFilters, writePaymentListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';

	const billing = $derived(detailDataContext.billing);
	const students = $derived(detailDataContext.students);
	const fees = $derived(detailDataContext.fees);
	const classes = $derived(academicContext.classes);

	type PaymentRow = {
		id: string;
		billingId: string;
		studentId: string;
		feeId: string;
		date: string;
		amount: number;
		status: 'paid' | 'pending';
	};

	const initialFilters = $derived(readPaymentListFilters($page.url));

	let q = $state('');
	let status = $state<'all' | 'paid' | 'pending'>('all');
	let classFilter = $state('all');
	let filtersReady = $state(false);

	const rows: PaymentRow[] = $derived.by(() => {
		const out: PaymentRow[] = [];
		billing.forEach((b) => {
			b.installments.forEach((i, idx) =>
				out.push({
					id: `${b.id}-${idx}`,
					billingId: b.id,
					studentId: b.studentId,
					feeId: b.feeId,
					date: i.date,
					amount: i.amount,
					status: i.status,
				}),
			);
		});
		return out.sort((a, b) => b.date.localeCompare(a.date));
	});

	const list = $derived(
		rows.filter((r) => {
			if (status !== 'all' && r.status !== status) {
				return false;
			}
			const st = students.find(s => s.id === r.studentId);
			if (!st) {
				return false;
			}
			if (classFilter !== 'all' && st.classId !== classFilter) {
				return false;
			}
			if (q && !st.name.toLowerCase().includes(q.toLowerCase())) {
				return false;
			}
			return true;
		}),
	);

	const collected = $derived(
		list.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0),
	);
	const pending = $derived(
		list.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0),
	);

	const statusKeys = ['all', 'paid', 'pending'] as const;
	const classFilterKeys = $derived(['all', ...classes.map(c => c.id)] as const);

	const classFilterOptions = $derived([
		{ value: 'all', label: $t('common.allClasses') },
		...classes.map(c => ({ value: c.id, label: c.name })),
	]);

	const statusFilterOptions = $derived(
		statusKeys.map(k => ({
			value: k,
			label: k === 'all'
				? $t('filter.all')
				: k === 'paid'
					? $t('installment.paid')
					: $t('installment.pending'),
		})),
	);

	function syncFiltersToUrl() {
		const href = writePaymentListFilters($page.url, { q, status, class: classFilter });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		status = (statusKeys.includes(next.status as (typeof statusKeys)[number])
			? next.status
			: 'all') as typeof status;
		classFilter = next.class;
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
		void status;
		void classFilter;
		scheduleFilterSync();
	});

	function openBillingReceipt(billingId: string) {
		appGoto(detailHref.financeBilling(billingId));
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader eyebrow={$t('finance.treasury')} title={$t('finance.payments')}>
		{#snippet search()}
			<ListSearchField bind:value={q} oninput={scheduleFilterSync} />
		{/snippet}
		{#snippet filters()}
			<div class="flex flex-wrap items-center gap-2">
				<FilterSelect
					bind:value={classFilter}
					class="h-9 min-w-[10rem] rounded-full text-xs"
					options={classFilterOptions}
				/>
				<FilterSelect
					bind:value={status}
					class="h-9 min-w-[9rem] rounded-full text-xs"
					options={statusFilterOptions}
				/>
			</div>
		{/snippet}
	</ListPageHeader>

	<div class="grid gap-3 sm:grid-cols-2">
		<div class="rounded-2xl border border-border bg-card p-5 shadow-soft">
			<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
				{$t('finance.collectedFiltered')}
			</p>
			<p class="mt-1 font-display text-2xl font-semibold tabular-nums">
				{collected.toLocaleString()} FCFA
			</p>
		</div>
		<div class="rounded-2xl border border-border bg-card p-5 shadow-soft">
			<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
				{$t('finance.pending')}
			</p>
			<p class="mt-1 font-display text-2xl font-semibold tabular-nums text-highlight">
				{pending.toLocaleString()} FCFA
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
			{#each list as r (r.id)}
				{@const st = students.find(s => s.id === r.studentId)}
				{@const fee = fees.find(f => f.id === r.feeId)}
				<li
					class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-3 last:border-b-0"
				>
					<div class="col-span-2 font-mono text-xs text-muted-foreground">
						{new Date(r.date).toLocaleDateString($locale, {
							day: 'numeric',
							month: 'short',
							year: '2-digit',
						})}
					</div>
					<div class="col-span-4 text-sm font-medium">{st?.name}</div>
					<div class="col-span-3 text-sm text-foreground/70">{fee?.name}</div>
					<div class="col-span-2 text-right font-display text-sm font-semibold tabular-nums">
						{r.amount.toLocaleString()} FCFA
					</div>
					<div class="col-span-1 flex items-center justify-end gap-1">
						{#if r.status === 'paid'}
							<span
								class="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
							>
								<Check class="h-3 w-3" />
								{$t('installment.paid')}
							</span>
						{:else}
							<span
								class="flex items-center gap-1 rounded-full bg-highlight-soft px-2 py-0.5 text-[10px] font-medium text-highlight"
							>
								<Clock class="h-3 w-3" />
								{$t('installment.pending')}
							</span>
						{/if}
						<RowActionMenu>
							{#snippet children()}
								<RowActionMenuItem onclick={() => openBillingReceipt(r.billingId)}>
									<Receipt class="h-4 w-4" />
									{$t('payment.viewReceipt')}
								</RowActionMenuItem>
							{/snippet}
						</RowActionMenu>
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
