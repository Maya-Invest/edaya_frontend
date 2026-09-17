<script lang="ts">
	import type { StudentBilling } from '$lib/types/school';
	import { page } from '$app/stores';
	import { studentYearAccountSourceId } from '$lib/api/documents-data';
	import { authSession } from '$lib/auth/session.svelte';
	import DocumentPdfButton from '$lib/components/school/documents/DocumentPdfButton.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { formatMinorUnits } from '$lib/finance/money';
	import { PAYMENT_ALLOCATE_PERMISSION } from '$lib/finance/permissions';
	import { billingStatusTone } from '$lib/finance/status';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { getBillingPageState } from '../../billing-page.svelte';
	import AllocateBalanceFormModal from './AllocateBalanceFormModal.svelte';
	import ChargeActionFormModal from './ChargeActionFormModal.svelte';
	import PaymentFormModal from './PaymentFormModal.svelte';
	import ReverseAllocationFormModal from './ReverseAllocationFormModal.svelte';

	const { billing }: { billing: StudentBilling } = $props();

	const billingPage = getBillingPageState();
	const live = $derived(billingPage.selectedBilling(billing.id) ?? billing);
	const student = $derived(billingPage.studentFor(live.studentId));
	const fee = $derived(billingPage.feeFor(live.catalogServiceId));
	const remaining = $derived(live.remaining);
	const pct = $derived(live.total > 0 ? (live.paid / live.total) * 100 : 0);
	const canRecordPayment = $derived(live.status !== 'cancelled' && live.status !== 'waived');
	const label = $derived(live.label || fee?.name || $t('billing.fee'));
	const accountSourceId = $derived(
		authSession.schoolId
			? studentYearAccountSourceId({
				schoolId: authSession.schoolId,
				studentId: live.studentId,
				academicYearId: live.academicYearId,
				currency: live.currency,
			})
			: null,
	);

	const modals = createUrlSyncedModals({
		allowed: ['payment', 'allocate', 'unallocate', 'waive', 'adjust', 'cancel'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const paymentOpen = bindUrlModal(modals, 'payment');
	const allocateOpen = bindUrlModal(modals, 'allocate');
	const unallocateOpen = bindUrlModal(modals, 'unallocate');
	const waiveOpen = bindUrlModal(modals, 'waive');
	const adjustOpen = bindUrlModal(modals, 'adjust');
	const cancelOpen = bindUrlModal(modals, 'cancel');
</script>

{#if student}
	<div class="space-y-5">
		<DrawerEntityHeader
			name={student.name}
			summary="{label} · {formatMinorUnits(remaining, live.currency, $locale)} {$t('finance.remaining')}"
		>
			{#snippet avatar()}
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-lg font-semibold text-primary-foreground"
				>
					{student.initials}
				</div>
			{/snippet}
			{#snippet chips()}
				<span class={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase', billingStatusTone[live.status])}>
					{$t(`billing.status.${live.status}`)}
				</span>
			{/snippet}
			{#snippet actions()}
				{#if canRecordPayment}
					<PermissionGate
						permission="PAYMENT_RECORD"
						mode="disable"
						tooltip={$t('payment.permissionRecord')}
					>
						{#snippet children({ disabled, title })}
							<Button
								size="sm"
								class="rounded-full"
								{disabled}
								{title}
								onclick={() => (paymentOpen.open = true)}
							>
								{$t('finance.recordPayment')}
							</Button>
						{/snippet}
					</PermissionGate>
				{/if}
				<PermissionGate
					permission={PAYMENT_ALLOCATE_PERMISSION}
					mode="disable"
					tooltip={$t('billing.permissionAllocate')}
				>
					{#snippet children({ disabled, title })}
						<Button
							size="sm"
							variant="secondary"
							class="rounded-full"
							{disabled}
							{title}
							onclick={() => (allocateOpen.open = true)}
						>
							{$t('billing.allocate')}
						</Button>
					{/snippet}
				</PermissionGate>
				<DocumentPdfButton
					templateKey="invoice.v1"
					sourceId={accountSourceId}
					studentId={live.studentId}
					permission="PAYMENT_READ"
				/>
			{/snippet}
			{#snippet overflow()}
				<PermissionGate permission="PAYMENT_RECORD">
					{#snippet children({ disabled, title })}
						<RowActionMenuItem {disabled} {title} onclick={() => (waiveOpen.open = true)}>
							{$t('billing.waive')}
						</RowActionMenuItem>
						<RowActionMenuItem {disabled} {title} onclick={() => (adjustOpen.open = true)}>
							{$t('billing.adjust')}
						</RowActionMenuItem>
					{/snippet}
				</PermissionGate>
				<PermissionGate permission="PAYMENT_REVERSE">
					{#snippet children({ disabled, title })}
						<RowActionMenuItem {disabled} {title} onclick={() => (unallocateOpen.open = true)}>
							{$t('billing.unallocate')}
						</RowActionMenuItem>
					{/snippet}
				</PermissionGate>
				<PermissionGate permission="PAYMENT_CANCEL">
					{#snippet children({ disabled, title })}
						<RowActionMenuItem destructive {disabled} {title} onclick={() => (cancelOpen.open = true)}>
							{$t('billing.cancel')}
						</RowActionMenuItem>
					{/snippet}
				</PermissionGate>
			{/snippet}
		</DrawerEntityHeader>

		<div class="rounded-2xl border border-border bg-secondary/40 p-4">
			<div class="flex items-end justify-between">
				<div>
					<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('finance.paid')}</p>
					<p class="font-sans text-3xl font-semibold tabular-nums">
						{formatMinorUnits(live.paid, live.currency, $locale)}
					</p>
				</div>
				<div class="text-right">
					<p class="text-[10px] uppercase tracking-wider text-muted-foreground">
						{$t('finance.remaining')}
					</p>
					<p class="font-sans text-xl font-semibold tabular-nums text-highlight">
						{formatMinorUnits(remaining, live.currency, $locale)}
					</p>
				</div>
			</div>
			<div class="mt-3 h-2 overflow-hidden rounded-full bg-card">
				<div
					class={cn('h-full rounded-full', live.status === 'overdue' ? 'bg-destructive' : 'bg-accent')}
					style="width: {pct}%"
				></div>
			</div>
			<p class="mt-2 font-sans tabular-nums text-[10px] uppercase text-muted-foreground">
				{$t('finance.total')}
				{formatMinorUnits(live.total, live.currency, $locale)}
			</p>
		</div>

		<div>
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('finance.installments')}
			</Label>
			<div class="mt-2 space-y-2">
				{#each live.installments as inst (inst.id)}
					<div class="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
						<div class="flex items-center gap-3">
							<div
								class={cn(
									'flex h-7 w-7 items-center justify-center rounded-full',
									inst.status === 'paid' ? 'bg-accent text-primary' : 'bg-secondary text-muted-foreground',
								)}
							>
								{#if inst.status === 'paid'}
									<Check class="h-3.5 w-3.5" />
								{:else}
									<Clock class="h-3.5 w-3.5" />
								{/if}
							</div>
							<div>
								<p class="text-sm font-medium">{formatMinorUnits(inst.amount, live.currency, $locale)}</p>
								<p class="font-sans tabular-nums text-[10px] text-muted-foreground">
									{inst.label}
									{#if inst.date}
										·
										{new Date(inst.date).toLocaleDateString($locale, {
											day: 'numeric',
											month: 'short',
											year: 'numeric',
										})}
									{/if}
								</p>
							</div>
						</div>
						<span
							class={cn(
								'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
								inst.status === 'paid'
									? 'bg-secondary text-foreground/80'
									: 'bg-highlight-soft text-highlight',
							)}
						>
							{$t(`installment.${inst.status}`)}
						</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<PaymentFormModal
		bind:open={paymentOpen.open}
		billing={live}
		studentName={student.name}
		feeName={label}
	/>
	<AllocateBalanceFormModal bind:open={allocateOpen.open} billing={live} />
	<ReverseAllocationFormModal bind:open={unallocateOpen.open} billing={live} />
	<ChargeActionFormModal bind:open={waiveOpen.open} billing={live} kind="waive" />
	<ChargeActionFormModal bind:open={adjustOpen.open} billing={live} kind="adjust" />
	<ChargeActionFormModal bind:open={cancelOpen.open} billing={live} kind="cancel" />
{/if}
