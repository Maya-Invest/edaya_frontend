<script lang="ts">
	import type { Fee } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { financeReadKey } from '$lib/api/finance-workspace';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { formatMinorUnits } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { openRouteSurface } from '$lib/navigation/route-surface-navigation';
	import { hasPermission } from '$lib/permissions';
	import AssignFeeFormModal from '../../billing/components/AssignFeeFormModal.svelte';
	import FinanceOverview from '../../components/FinanceOverview.svelte';
	import { getFeesPageState } from '../fees-page.svelte';
	import FeeAutoBilling from './FeeAutoBilling.svelte';

	const { fee }: { fee: Fee } = $props();
	const state = getFeesPageState();
	const overviewQuery = $derived(state.queryOverview(fee.id));
	const modals = createUrlSyncedModals({ allowed: () => hasPermission('PAYMENT_RECORD') && fee.status === 'active' ? ['assign-fee'] as const : [], owned: ['assign-fee'], getUrl: () => $page.url });
	const assign = bindUrlModal(modals, 'assign-fee');
	$effect(() => {
		modals.hydrate();
	});
	function edit(kind: 'edit' | 'archive' | 'activate') {
		const url = new URL($page.url);
		url.searchParams.set('modal', kind);
		url.searchParams.set('modalTarget', fee.id);
		openRouteSurface(url.pathname + url.search, $page.url.pathname + $page.url.search);
	}
	function assignments(due: string | undefined = undefined) {
		const url = new URL('/finance/billing', $page.url);
		url.searchParams.set('fee', fee.id);
		if (due)
			url.searchParams.set('due', due);
		appGoto(url.pathname + url.search);
	}
</script>
<div class="space-y-6">
	<DrawerEntityHeader name={fee.name} summary={`${$t(`feeCat.${fee.category}`)} · ${academicContext.years.find(year => year.id === fee.academicYearId)?.label ?? ''} · ${formatMinorUnits(fee.amount, fee.currency, $locale)}`}>
		{#snippet chips()}<span class="rounded-full bg-secondary px-3 py-1 text-xs">{$t(`fee.status.${fee.status}`)}</span>{/snippet}
		{#snippet actions()}
			<PermissionGate permission="FINANCIAL_CATALOG_MANAGE"><Button size="sm" onclick={() => edit('edit')}>{$t('finance.editFee')}</Button></PermissionGate>
			<PermissionGate permission="PAYMENT_RECORD"><Button size="sm" variant="secondary" disabled={fee.status !== 'active'} title={fee.status !== 'active' ? $t('finance.activeFeeRequired') : undefined} onclick={() => modals.open('assign-fee')}>{$t('finance.newInvoice')}</Button></PermissionGate>
		{/snippet}
		{#snippet overflow()}
			<PermissionGate permission="FINANCIAL_CATALOG_MANAGE">
				{#if fee.status === 'active'}<RowActionMenuItem onclick={() => edit('archive')}>{$t('fee.archive')}</RowActionMenuItem>
				{:else}<RowActionMenuItem onclick={() => edit('activate')}>{$t('fee.activate')}</RowActionMenuItem>{/if}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>
	<nav aria-label={$t('finance.tab.overview')} class="rounded-full border border-border bg-secondary/40 p-1"><span class="inline-block rounded-full bg-card px-4 py-2 text-sm font-medium shadow-soft">{$t('finance.tab.overview')}</span></nav>
	{#if hasPermission('PAYMENT_READ')}
		<PageQuery query={overviewQuery} cache={false} cacheKey={() => financeReadKey(`fee-overview:${fee.id}`)}>
			{#snippet children(data)}<DataState status={data.status} errorMessage={data.errorMessage}>{#if data.overview}<FinanceOverview overview={data.overview} fee />{/if}</DataState>{/snippet}
		</PageQuery>
		<div class="flex flex-wrap gap-2">
			<Button variant="outline" onclick={() => assignments()}>{$t('finance.allAssignments')}</Button>
			<Button variant="outline" onclick={() => assignments('outstanding')}>{$t('finance.outstandingAssignments')}</Button>
			<Button variant="outline" onclick={() => assignments('overdue')}>{$t('finance.overdueAssignments')}</Button>
		</div>
	{/if}
	<DrawerField label={$t('finance.description')}><p class="whitespace-pre-wrap text-sm">{fee.description || '—'}</p></DrawerField>
	<div class="grid gap-4 sm:grid-cols-2">
		<DrawerField label={$t('fee.amount')}><p>{formatMinorUnits(fee.amount, fee.currency, $locale)}</p></DrawerField>

	</div>
	<FeeAutoBilling {fee} />
	<DrawerField label={$t('finance.installments')}>
		{#each fee.billingTerms?.installments ?? [] as installment, i (i)}
			<p class="flex justify-between gap-3 border-b border-border py-3 text-sm"><span>{installment.label}</span><span>{installment.percentage}% · {installment.dueDate?.slice(0, 10) ?? '—'}</span></p>
		{:else}<p class="text-sm">{fee.billingTerms?.singleDueDate?.slice(0, 10) ?? $t('finance.noDueDate')}</p>{/each}
	</DrawerField>
	<p class="text-xs text-muted-foreground">{$t('finance.catalogEditHint')}</p>
</div>
<AssignFeeFormModal bind:open={assign.open} owner={state} fixedFeeId={fee.id} onBatchCreated={id => appGoto(`/finance/billing?fee=${encodeURIComponent(id)}`)} onCreated={id => appGoto(`/finance/billing/${encodeURIComponent(id)}`)} />
