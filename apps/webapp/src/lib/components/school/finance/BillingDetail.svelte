<script lang="ts">
	import type { StudentBilling } from '$lib/types/school';
	import { page } from '$app/stores';
	import { deleteStudentFeeMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock, Trash2 } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import PaymentFormModal from './PaymentFormModal.svelte';

	const { b }: { b: StudentBilling } = $props();

	const student = $derived(detailDataContext.students.find(s => s.id === b.studentId));
	const fee = $derived(detailDataContext.fees.find(f => f.id === b.feeId));
	const remaining = $derived(b.total - b.paid);
	const pct = $derived((b.paid / b.total) * 100);
	const canRecordPayment = $derived(remaining > 0 && b.status !== 'paid');

	const modals = createUrlSyncedModals({ allowed: ['payment'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const paymentOpen = bindUrlModal(modals, 'payment');

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	const statusStyle: Record<StudentBilling['status'], string> = {
		paid: 'bg-secondary text-foreground/80',
		partial: 'bg-secondary text-foreground/80',
		due: 'bg-highlight-soft text-highlight',
		overdue: 'bg-destructive/10 text-destructive',
	};

	async function confirmDelete() {
		if (!student) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await deleteStudentFeeMutation(b.id, {
				successMessage: get(t)('finance.toastBillingDeleted'),
			});
			if (ok) {
				deleteOpen = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

{#if student && fee}
	<div class="space-y-5">
		<DrawerEntityHeader
			name={student.name}
			summary="{fee.name} · {remaining.toLocaleString()} FCFA {$t('finance.remaining')}"
		>
			{#snippet avatar()}
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-lg font-semibold text-primary-foreground"
				>
					{student.initials}
				</div>
			{/snippet}
			{#snippet chips()}
				<span class={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase', statusStyle[b.status])}>
					{$t(`billing.status.${b.status}`)}
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
			{/snippet}
			{#snippet overflow()}
				<PermissionGate permission="FINANCIAL_CONFIG_CONFIGURE">
					{#snippet children({ disabled, title })}
						<RowActionMenuItem
							destructive
							{disabled}
							{title}
							onclick={() => (deleteOpen = true)}
						>
							<Trash2 class="h-4 w-4" />
							{$t('common.delete')}
						</RowActionMenuItem>
					{/snippet}
				</PermissionGate>
			{/snippet}
		</DrawerEntityHeader>

		<div class="rounded-2xl border border-border bg-secondary/40 p-4">
			<div class="flex items-end justify-between">
				<div>
					<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('finance.paid')}</p>
					<p class="font-display text-3xl font-semibold tabular-nums">{b.paid.toLocaleString()} FCFA</p>
				</div>
				<div class="text-right">
					<p class="text-[10px] uppercase tracking-wider text-muted-foreground">
						{$t('finance.remaining')}
					</p>
					<p class="font-display text-xl font-semibold tabular-nums text-highlight">
						{remaining.toLocaleString()} FCFA
					</p>
				</div>
			</div>
			<div class="mt-3 h-2 overflow-hidden rounded-full bg-card">
				<div
					class={cn('h-full rounded-full', b.status === 'overdue' ? 'bg-destructive' : 'bg-accent')}
					style="width: {pct}%"
				></div>
			</div>
			<p class="mt-2 font-mono text-[10px] uppercase text-muted-foreground">
				{$t('finance.total')}
				{b.total.toLocaleString()} FCFA
			</p>
		</div>

		<div>
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('finance.installments')}
			</Label>
			<div class="mt-2 space-y-2">
				{#each b.installments as inst, i (i)}
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
								<p class="text-sm font-medium">{inst.amount.toLocaleString()} FCFA</p>
								<p class="font-mono text-[10px] text-muted-foreground">
									{new Date(inst.date).toLocaleDateString($locale, {
										day: 'numeric',
										month: 'short',
										year: 'numeric',
									})}
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
		showTrigger={false}
		billing={b}
		studentName={student.name}
		feeName={fee.name}
	/>

	<ConfirmModal
		bind:open={deleteOpen}
		title={$t('common.deleteConfirmTitle')}
		description={$t('finance.deleteBillingConfirm', { name: student.name })}
		confirmLabel={$t('common.delete')}
		cancelLabel={$t('common.cancel')}
		busy={deleteBusy}
		onConfirm={confirmDelete}
	/>
{/if}
