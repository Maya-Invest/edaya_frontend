<script lang="ts">
	import { DEFAULT_CATALOG_CURRENCY } from '$lib/api/finance-types';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { formatMinorUnits } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { cn } from '$lib/utils';
	import FinanceSubnav from '../../components/FinanceSubnav.svelte';
	import { getReconciliationPageState } from '../reconciliation-page.svelte';

	const reconciliationPage = getReconciliationPageState();
	const report = $derived(reconciliationPage.reconciliation);
	const accounts = $derived(report?.accounts ?? []);
	const charges = $derived(report?.charges ?? []);
	const currency = DEFAULT_CATALOG_CURRENCY;
	const hasDiffs = $derived(
		accounts.some(row => row.difference !== 0) || charges.some(row => row.difference !== 0),
	);
	const showEmpty = $derived((report?.balanced ?? true) && !hasDiffs);
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader eyebrow={$t('finance.financeEyebrow')} title={$t('finance.reconciliation')}>
		{#snippet filters()}
			<FinanceSubnav active="reconciliation" />
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'reconciliation.csv',
					headers: ['kind', 'id', 'studentId', 'projected', 'actual', 'difference'],
					loadAll: async () => [
						...accounts.map(row => [
							'account',
							row.accountId,
							row.studentId,
							row.projectedAvailable,
							row.entrySum,
							row.difference,
						]),
						...charges.map(row => [
							'charge',
							row.chargeId,
							row.studentId,
							row.projectedAllocated,
							row.settlement,
							row.difference,
						]),
					],
				})}
			/>
		{/snippet}
	</ListPageHeader>

	<div class="rounded-2xl border border-border bg-card p-5 shadow-soft">
		<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
			{$t('finance.reconciliationStatus')}
		</p>
		<span
			class={cn(
				'mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase',
				report?.balanced
					? 'bg-secondary text-foreground/80'
					: 'bg-destructive/10 text-destructive',
			)}
		>
			{report?.balanced ? $t('finance.reconciliationBalanced') : $t('finance.reconciliationUnbalanced')}
		</span>
	</div>

	{#if showEmpty}
		<div class="rounded-2xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground shadow-soft">
			{$t('finance.reconciliationEmpty')}
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
			<div
				class="border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				{$t('finance.reconciliationAccounts')}
			</div>
			<div
				class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/20 px-5 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				<div class="col-span-3">{$t('finance.reconciliationAccounts')}</div>
				<div class="col-span-2">{$t('events.student')}</div>
				<div class="col-span-3 text-right">{$t('finance.availableBalance')}</div>
				<div class="col-span-2 text-right">{$t('finance.reconciliationEntrySum')}</div>
				<div class="col-span-2 text-right">{$t('finance.reconciliationDifference')}</div>
			</div>
			<ul>
				{#each accounts as row (row.accountId)}
					<li class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-3 last:border-b-0 text-sm">
						<div class="col-span-3 truncate font-sans tabular-nums text-xs">{row.accountId}</div>
						<div class="col-span-2 truncate font-sans tabular-nums text-xs">{row.studentId}</div>
						<div class="col-span-3 text-right font-sans tabular-nums">
							{formatMinorUnits(row.projectedAvailable, currency, $locale)}
						</div>
						<div class="col-span-2 text-right font-sans tabular-nums">
							{formatMinorUnits(row.entrySum, currency, $locale)}
						</div>
						<div
							class={cn(
								'col-span-2 text-right font-sans tabular-nums',
								row.difference !== 0 && 'text-destructive',
							)}
						>
							{formatMinorUnits(row.difference, currency, $locale)}
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
			<div
				class="border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				{$t('finance.reconciliationCharges')}
			</div>
			<div
				class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/20 px-5 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				<div class="col-span-3">{$t('finance.reconciliationCharges')}</div>
				<div class="col-span-2">{$t('events.student')}</div>
				<div class="col-span-3 text-right">{$t('finance.reconciliationAllocated')}</div>
				<div class="col-span-2 text-right">{$t('finance.reconciliationSettlement')}</div>
				<div class="col-span-2 text-right">{$t('finance.reconciliationDifference')}</div>
			</div>
			<ul>
				{#each charges as row (row.chargeId)}
					<li class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-3 last:border-b-0 text-sm">
						<div class="col-span-3 truncate font-sans tabular-nums text-xs">{row.chargeId}</div>
						<div class="col-span-2 truncate font-sans tabular-nums text-xs">{row.studentId}</div>
						<div class="col-span-3 text-right font-sans tabular-nums">
							{formatMinorUnits(row.projectedAllocated, currency, $locale)}
						</div>
						<div class="col-span-2 text-right font-sans tabular-nums">
							{formatMinorUnits(row.settlement, currency, $locale)}
						</div>
						<div
							class={cn(
								'col-span-2 text-right font-sans tabular-nums',
								row.difference !== 0 && 'text-destructive',
							)}
						>
							{formatMinorUnits(row.difference, currency, $locale)}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
