<script lang="ts">
	import type { StudentBilling } from '$lib/types/school';
	import { deleteStudentFeeMutation } from '$lib/api/mutations/delete-entity.mutations';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';
	import PaymentFormModal from './PaymentFormModal.svelte';

	const { b }: { b: StudentBilling } = $props();

	const student = $derived(detailDataContext.students.find(s => s.id === b.studentId));
	const fee = $derived(detailDataContext.fees.find(f => f.id === b.feeId));
	const remaining = $derived(b.total - b.paid);
	const pct = $derived((b.paid / b.total) * 100);
	const canRecordPayment = $derived(remaining > 0 && b.status !== 'paid');
</script>

{#if student && fee}
	<div class="space-y-5">
		<div class="flex items-center gap-4">
			<div
				class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-lg font-semibold text-primary-foreground"
			>
				{student.initials}
			</div>
			<div>
				<h3 class="font-display text-xl font-semibold leading-tight">{student.name}</h3>
				<p class="text-sm text-muted-foreground">{fee.name}</p>
			</div>
		</div>

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

		{#if canRecordPayment}
			<DrawerActionBar>
				<PermissionGate
					permission="PAYMENT_RECORD"
					mode="disable"
					tooltip={$t('payment.permissionRecord')}
				>
					{#snippet children({ disabled, title })}
						<PaymentFormModal
							billing={b}
							studentName={student.name}
							feeName={fee.name}
							{disabled}
							{title}
						/>
					{/snippet}
				</PermissionGate>
				<PermissionGate
					permission="FINANCIAL_CONFIG_CONFIGURE"
					mode="disable"
					tooltip={$t('fee.permissionConfigure')}
				>
					{#snippet children({ disabled, title })}
						<DeleteEntityButton
							{disabled}
							{title}
							confirmTitle={$t('common.deleteConfirmTitle')}
							confirmDescription={$t('finance.deleteBillingConfirm', { name: student.name })}
							onConfirm={() => deleteStudentFeeMutation(b.id, {
								successMessage: get(t)('finance.toastBillingDeleted'),
							})}
						/>
					{/snippet}
				</PermissionGate>
			</DrawerActionBar>
		{:else}
			<DrawerActionBar>
				<PermissionGate
					permission="FINANCIAL_CONFIG_CONFIGURE"
					mode="disable"
					tooltip={$t('fee.permissionConfigure')}
				>
					{#snippet children({ disabled, title })}
						<DeleteEntityButton
							{disabled}
							{title}
							confirmTitle={$t('common.deleteConfirmTitle')}
							confirmDescription={$t('finance.deleteBillingConfirm', { name: student.name })}
							onConfirm={() => deleteStudentFeeMutation(b.id, {
								successMessage: get(t)('finance.toastBillingDeleted'),
							})}
						/>
					{/snippet}
				</PermissionGate>
			</DrawerActionBar>
		{/if}
	</div>
{/if}
