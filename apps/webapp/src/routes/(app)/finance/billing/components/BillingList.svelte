<script lang="ts">
	import type { StudentBilling } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { formatMinorUnits } from '$lib/finance/money';
	import { billingStatusTone } from '$lib/finance/status';
	import { locale, t } from '$lib/i18n';
	import { Plus, TrendingUp, AlertCircle, Wallet } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { cn } from '$lib/utils';
	import FinanceSubnav from '../../components/FinanceSubnav.svelte';
	import { getBillingPageState } from '../billing-page.svelte';
	import AssignFeeFormModal from './AssignFeeFormModal.svelte';

	const {
		onSelectBilling,
		selectedId,
	}: {
		onSelectBilling?: (b: StudentBilling) => void;
		selectedId?: string;
	} = $props();

	const billingPage = getBillingPageState();
	const fees = $derived(billingPage.fees);
	const billing = $derived(billingPage.billing);
	const students = $derived(billingPage.students);
	const displayCurrency = $derived(billing[0]?.currency || fees[0]?.currency || 'XOF');

	const modals = createUrlSyncedModals({ allowed: ['assign-fee'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const assignFeeOpen = bindUrlModal(modals, 'assign-fee');

	const totals = $derived.by(() => {
		const totalDue = billing.reduce((sum, row) => sum + row.remaining, 0);
		const collected = billing.reduce((sum, row) => sum + row.paid, 0);
		const overdue = billing.filter(row => row.status === 'overdue').length;
		return { totalDue, collected, overdue };
	});

	const statToneMap = {
		mint: 'bg-secondary text-foreground/80',
		warm: 'bg-highlight-soft text-highlight',
		alert: 'bg-destructive/10 text-destructive',
	} as const;

	function handleBillingCreated(chargeId: string) {
		const path = detailHref.financeBilling(chargeId);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader eyebrow={$t('finance.financeEyebrow')} title={$t('finance.title')}>
		{#snippet filters()}
			<FinanceSubnav active="billing" />
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="PAYMENT_RECORD"
				mode="disable"
				tooltip={$t('invoice.permissionEnroll')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (assignFeeOpen.open = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('finance.newInvoice')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<AssignFeeFormModal bind:open={assignFeeOpen.open} onCreated={handleBillingCreated} />

	<div class="grid gap-3 sm:grid-cols-3">
		<div class="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
			<div class={cn('flex h-11 w-11 items-center justify-center rounded-xl', statToneMap.mint)}>
				<TrendingUp class="h-5 w-5" />
			</div>
			<div>
				<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
					{$t('finance.collected')}
				</p>
				<p class="font-sans text-2xl font-semibold tabular-nums">
					{formatMinorUnits(totals.collected, displayCurrency, $locale)}
				</p>
			</div>
		</div>
		<div class="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
			<div class={cn('flex h-11 w-11 items-center justify-center rounded-xl', statToneMap.warm)}>
				<Wallet class="h-5 w-5" />
			</div>
			<div>
				<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
					{$t('finance.outstanding')}
				</p>
				<p class="font-sans text-2xl font-semibold tabular-nums">
					{formatMinorUnits(totals.totalDue, displayCurrency, $locale)}
				</p>
			</div>
		</div>
		<div class="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
			<div class={cn('flex h-11 w-11 items-center justify-center rounded-xl', statToneMap.alert)}>
				<AlertCircle class="h-5 w-5" />
			</div>
			<div>
				<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
					{$t('finance.overdueAccounts')}
				</p>
				<p class="font-sans text-2xl font-semibold tabular-nums">{totals.overdue}</p>
			</div>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-4">{$t('events.student')}</div>
			<div class="col-span-3">{$t('billing.fee')}</div>
			<div class="col-span-2">{$t('billing.progress')}</div>
			<div class="col-span-2">{$t('billing.due')}</div>
			<div class="col-span-1 text-right">{$t('students.status')}</div>
		</div>
		<ul>
			{#if billing.length === 0}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">
					{$t('dataState.emptyDescription')}
				</li>
			{:else}
				{#each billing as row (row.id)}
					{@const student = students.find(entry => entry.id === row.studentId)}
					{@const fee = fees.find(entry => entry.id === row.catalogServiceId)}
					{@const pct = row.total > 0 ? (row.paid / row.total) * 100 : 0}
					{@const active = selectedId === row.id}
					<li>
						<button
							type="button"
							onclick={() => onSelectBilling?.(row)}
							class={cn(
								'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0',
								active ? 'bg-primary/10' : 'hover:bg-secondary',
							)}
						>
							<div class="col-span-4 flex items-center gap-3">
								<div
									class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-xs font-semibold text-primary-foreground"
								>
									{student?.initials ?? '—'}
								</div>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{student?.name ?? $t('events.student')}</p>
									<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
										{student?.classId ?? ''}
									</p>
								</div>
							</div>
							<div class="col-span-3">
								<p class="truncate text-sm">{row.label || fee?.name || $t('billing.fee')}</p>
								<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
									{fee ? $t(`feeCat.${fee.category}`) : ''}
								</p>
							</div>
							<div class="col-span-2">
								<p class="font-sans tabular-nums text-xs">
									{formatMinorUnits(row.paid, row.currency, $locale)}
									/
									{formatMinorUnits(row.total, row.currency, $locale)}
								</p>
								<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
									<div
										class={cn('h-full rounded-full', row.status === 'overdue' ? 'bg-destructive' : 'bg-accent')}
										style:width="{pct}%"
									></div>
								</div>
							</div>
							<div class="col-span-2 text-xs text-foreground/70">
								{row.dueDate
									? new Date(row.dueDate).toLocaleDateString($locale, {
										day: 'numeric',
										month: 'short',
										year: 'numeric',
									})
									: '—'}
							</div>
							<div class="col-span-1 flex justify-end">
								<span
									class={cn(
										'rounded-full px-2 py-1 text-[10px] font-medium uppercase',
										billingStatusTone[row.status],
									)}
								>
									{$t(`billing.status.${row.status}`)}
								</span>
							</div>
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	</div>
</div>
