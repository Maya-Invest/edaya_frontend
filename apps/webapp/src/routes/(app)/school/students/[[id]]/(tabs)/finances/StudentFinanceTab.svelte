<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { fmtDateFr } from '$lib/components/school/shared/drawer-constants';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock, Wallet } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { billingStatusTone, getStudentFinanceTabState } from './student-finance-tab.svelte';

	const { s }: { s: Student } = $props();

	const financesTab = getStudentFinanceTabState();
	const financesData = $derived(financesTab.financesSummaryFor(s.id));
	const fees = $derived(financesTab.feesFor(s.id));
</script>

<div class="space-y-4">
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-xl bg-secondary p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('finance.total')}</p>
			<p class="mt-1 font-display text-2xl">{financesData.total.toLocaleString($locale)} €</p>
		</div>
		<div class="rounded-xl bg-primary/10 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('finance.paid')}</p>
			<p class="mt-1 font-display text-2xl">{financesData.paid.toLocaleString($locale)} €</p>
		</div>
		<div class="rounded-xl bg-secondary/60 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('finance.remaining')}</p>
			<p class="mt-1 font-display text-2xl">{financesData.balance.toLocaleString($locale)} €</p>
		</div>
	</div>
	<div>
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('finance.billing')} · {financesData.studentBilling.length}
		</Label>
		<div class="mt-2 space-y-2">
			{#if financesData.studentBilling.length === 0}
				<DrawerEmptyState label={$t('finance.noInvoices')}>
					{#snippet icon()}
						<Wallet class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each financesData.studentBilling as billing (billing.id)}
					{@const fee = fees.find(item => item.id === billing.feeId)}
					<div class="rounded-xl border border-border bg-card p-4">
						<div class="flex items-center justify-between">
							<span
								class={cn(
									'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
									billingStatusTone[billing.status],
								)}
							>
								{billing.status}
							</span>
							<span class="font-sans tabular-nums text-[10px] text-muted-foreground">{fmtDateFr(billing.dueDate, $locale)}</span>
						</div>
						<p class="mt-2 text-sm font-medium">{fee?.name ?? $t('billing.fee')}</p>
						<p class="mt-1 text-xs text-muted-foreground">
							{billing.paid.toLocaleString($locale)} € / {billing.total.toLocaleString($locale)} €
						</p>
						{#if billing.installments.length > 0}
							<div class="mt-3 space-y-1.5 border-t border-border pt-3">
								<p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
									{$t('finance.paymentDetails')}
								</p>
								{#each billing.installments as installment, index (index)}
									<div class="flex items-center justify-between gap-2 text-xs">
										<div class="flex items-center gap-2">
											<span
												class={cn(
													'flex h-5 w-5 items-center justify-center rounded-full',
													installment.status === 'paid'
														? 'bg-secondary text-foreground/80'
														: 'bg-secondary text-muted-foreground',
												)}
											>
												{#if installment.status === 'paid'}
													<Check class="h-3 w-3" />
												{:else}
													<Clock class="h-3 w-3" />
												{/if}
											</span>
											<span class="font-sans tabular-nums text-[10px] text-muted-foreground">
												{fmtDateFr(installment.date, $locale)}
											</span>
										</div>
										<span
											class={cn(
												'font-sans tabular-nums',
												installment.status === 'paid' ? 'text-foreground' : 'text-muted-foreground',
											)}
										>
											{installment.amount.toLocaleString($locale)} €
										</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
