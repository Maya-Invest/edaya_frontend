<script lang="ts">
	import type { StudentBilling } from '$lib/types/school';
	import { page } from '$app/stores';
	import { studentYearAccountSourceId } from '$lib/api/documents-data';
	import { authSession } from '$lib/auth/session.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { formatMinorUnits } from '$lib/finance/money';
	import { billingStatusTone } from '$lib/finance/status';
	import { locale, t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { navigateWithinRouteSurface } from '$lib/navigation/route-surface-navigation';
	import { hasPermission } from '$lib/permissions';
	import { cn } from '$lib/utils';
	import { SvelteURL } from 'svelte/reactivity';
	import { getBillingPageState } from '../../billing-page.svelte';
	import AllocateBalanceFormModal from './AllocateBalanceFormModal.svelte';
	import BillingActivity from './BillingActivity.svelte';
	import ChargeActionFormModal from './ChargeActionFormModal.svelte';
	import PaymentFormModal from './PaymentFormModal.svelte';
	import ReverseAllocationFormModal from './ReverseAllocationFormModal.svelte';

	const { billing }: { billing: StudentBilling } = $props();
	const state = getBillingPageState();
	const live = $derived(state.selectedBilling(billing.id) ?? billing);
	const studentName = $derived(live.studentName ?? state.studentFor(live.studentId)?.name ?? live.studentId);
	const tab = $derived($page.url.pathname.split('/')[4] ?? 'overview');
	const ctx = $derived({ studentId: live.studentId, classId: live.classId ?? state.studentFor(live.studentId)?.classId });
	const record = $derived(hasPermission('PAYMENT_RECORD', ctx));
	const allocate = $derived(hasPermission('PAYMENT_ALLOCATE', ctx));
	const cancel = $derived(record && hasPermission('PAYMENT_CANCEL', ctx));
	const credit = $derived(state.accountForStudent(live.studentId)?.availableBalance ?? live.availableCredit ?? 0);
	const openBalance = $derived(live.status !== 'cancelled' && live.remaining > 0);
	const billingActions = $derived([
		{ key: 'payment', label: 'finance.recordPayment', permission: record, enabled: openBalance, reason: 'finance.noBalance' },
		{ key: 'allocate', label: 'billing.allocate', permission: allocate, enabled: openBalance && credit > 0, reason: credit <= 0 ? 'finance.noCredit' : 'finance.noBalance' },
		{ key: 'adjust', label: 'billing.adjust', permission: record, enabled: openBalance && !live.adjustedAt, reason: live.adjustedAt ? 'finance.alreadyAdjusted' : 'finance.noBalance' },
		{ key: 'waive', label: 'billing.waive', permission: record, enabled: openBalance && !live.waivedAt, reason: live.waivedAt ? 'finance.alreadyWaived' : 'finance.noBalance' },
		{ key: 'unallocate', label: 'billing.unallocate', permission: allocate, enabled: live.paid > 0, reason: 'finance.noAllocations' },
		{ key: 'cancel', label: 'billing.cancel', permission: cancel, enabled: live.status !== 'cancelled' && live.paid === 0, reason: live.status === 'cancelled' ? 'finance.alreadyCancelled' : 'finance.reverseFirst' },
	] as const);
	const modals = createUrlSyncedModals({ allowed: () => billingActions.filter(action => action.permission && action.enabled).map(action => action.key), owned: ['payment', 'allocate', 'adjust', 'waive', 'unallocate', 'cancel'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const paymentOpen = bindUrlModal(modals, 'payment');
	const allocateOpen = bindUrlModal(modals, 'allocate');
	const unallocateOpen = bindUrlModal(modals, 'unallocate');
	const adjustOpen = bindUrlModal(modals, 'adjust');
	const waiveOpen = bindUrlModal(modals, 'waive');
	const cancelOpen = bindUrlModal(modals, 'cancel');
	function navigateTab(next: string) {
		const url = new SvelteURL($page.url);
		url.pathname = `/finance/billing/${encodeURIComponent(live.id)}${next === 'overview' ? '' : `/${next}`}`;
		if ($page.state.routeSurfaceParent)
			navigateWithinRouteSurface(url.pathname + url.search);
		else void appGoto(url.pathname + url.search, { state: $page.state, keepFocus: true, noScroll: true });
	}
	async function invoice() {
		if (!authSession.schoolId || !hasPermission('PAYMENT_READ', ctx) || !live.accountHasOpenCharges)
			return;
		await state.performRequestDocumentIssuance({ templateKey: 'invoice.v1', sourceId: studentYearAccountSourceId({ schoolId: authSession.schoolId, studentId: live.studentId, academicYearId: live.academicYearId, currency: live.currency }), studentId: live.studentId, successMessage: $t('documents.toastRequested') });
	}
</script>
<div class="space-y-6">
	<DrawerEntityHeader name={live.label} summary={`${studentName} · ${formatMinorUnits(live.remaining, live.currency, $locale)} ${$t('finance.remaining')}`}>
		{#snippet chips()}<span class={cn('rounded-full px-3 py-1 text-xs', billingStatusTone[live.status])}>{$t(`billing.status.${live.status}`)}</span>{/snippet}
		{#snippet actions()}
			{#each billingActions.slice(0, 2) as action (action.key)}{#if action.permission}
				<Button size="sm" variant={action.key === 'payment' ? 'default' : 'secondary'} disabled={!action.enabled} title={!action.enabled ? $t(action.reason) : undefined} onclick={() => modals.open(action.key)}>{$t(action.label)}</Button>
			{/if}{/each}
		{/snippet}
		{#snippet overflow()}
			{#each billingActions.slice(2) as action (action.key)}{#if action.permission}
				<RowActionMenuItem disabled={!action.enabled} title={!action.enabled ? $t(action.reason) : undefined} destructive={action.key === 'cancel'} onclick={() => modals.open(action.key)}>{$t(action.label)}</RowActionMenuItem>
			{/if}{/each}
			{#if hasPermission('PAYMENT_READ', ctx)}<RowActionMenuItem disabled={!live.accountHasOpenCharges} title={!live.accountHasOpenCharges ? $t('finance.noBalance') : $t('finance.accountInvoiceHint')} onclick={() => void invoice()}>{$t('finance.accountInvoice')}</RowActionMenuItem>{/if}
		{/snippet}
	</DrawerEntityHeader>
	<nav aria-label={$t('finance.billing')} class="flex gap-1 overflow-x-auto rounded-full border border-border bg-secondary/40 p-1">
		{#each ['overview', 'payments', 'history'] as value (value)}
			<button type="button" aria-current={tab === value ? 'page' : undefined} class={cn('whitespace-nowrap rounded-full px-4 py-2 text-sm', tab === value ? 'bg-card font-medium shadow-soft' : 'text-muted-foreground')} onclick={() => navigateTab(value)}>{$t(`finance.tab.${value}`)}</button>
		{/each}
	</nav>
	{#if tab === 'overview'}
		<dl class="grid gap-4 rounded-2xl border border-border p-5 sm:grid-cols-2">
			{#each [['finance.originalAmount', live.total], ['finance.adjustment', live.adjustmentAmount ?? 0], ['finance.waiver', live.waiverAmount ?? 0], ['finance.netBilled', live.netAmount ?? live.total], ['finance.applied', live.paid], ['finance.remaining', live.remaining]] as [label, amount] (label)}
				<div><dt class="text-xs uppercase tracking-wider text-muted-foreground">{$t(String(label))}</dt><dd class="mt-1 font-sans text-xl font-semibold tabular-nums">{formatMinorUnits(Number(amount), live.currency, $locale)}</dd></div>
			{/each}
		</dl>
		{#if live.status === 'cancelled'}<DrawerField label={$t('finance.event.cancelled')}><p>{live.cancellationReason ?? '—'}</p><p class="text-xs text-muted-foreground">{live.cancelledAt ? new Date(live.cancelledAt).toLocaleString($locale) : $t('finance.notRecorded')}</p></DrawerField>{/if}
		<DrawerField label={$t('finance.installments')}>
			<div class="space-y-2">
				{#each live.installments as installment (installment.id)}
					<article class="rounded-xl border border-border p-3">
						<div class="flex justify-between gap-3"><p class="text-sm font-medium">{installment.label}</p><span class="rounded-full bg-secondary px-2 py-1 text-xs">{$t(`installment.${installment.status}`)}</span></div>
						<p class="mt-1 text-sm">{formatMinorUnits(installment.amount, live.currency, $locale)} · {installment.date || $t('finance.noDueDate')}</p>
						<p class="mt-1 text-xs text-muted-foreground">{$t('finance.applied')}: {formatMinorUnits(installment.applied ?? 0, live.currency, $locale)}</p>
					</article>
				{:else}<p class="text-sm">{live.dueDate || $t('finance.noDueDate')}</p>{/each}
			</div>
		</DrawerField>
		{#if live.adjustmentAmount || live.waiverAmount}<p class="text-xs text-muted-foreground">{$t('finance.scheduleReductionHint')}</p>{/if}
	{:else}<BillingActivity billing={live} {tab} />{/if}
</div>
{#if paymentOpen.open}<PaymentFormModal bind:open={paymentOpen.open} billing={live} {studentName} feeName={live.label} />{/if}
{#if allocateOpen.open}<AllocateBalanceFormModal bind:open={allocateOpen.open} billing={live} />{/if}
{#if unallocateOpen.open}<ReverseAllocationFormModal bind:open={unallocateOpen.open} billing={live} />{/if}
{#if waiveOpen.open}<ChargeActionFormModal bind:open={waiveOpen.open} billing={live} kind="waive" />{/if}
{#if adjustOpen.open}<ChargeActionFormModal bind:open={adjustOpen.open} billing={live} kind="adjust" />{/if}
{#if cancelOpen.open}<ChargeActionFormModal bind:open={cancelOpen.open} billing={live} kind="cancel" />{/if}
