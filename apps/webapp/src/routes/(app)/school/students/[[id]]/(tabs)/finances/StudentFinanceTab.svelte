<script lang="ts">
	import type { Student, StudentChargeStatus } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { studentYearAccountSourceId } from '$lib/api/documents-data';
	import { authSession } from '$lib/auth/session.svelte';
	import DocumentPdfButton from '$lib/components/school/documents/DocumentPdfButton.svelte';
	import { fmtDateFr } from '$lib/components/school/shared/drawer-constants';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { formatMinorUnits } from '$lib/finance/money';
	import { FINANCIAL_REPORT_READ_PERMISSION } from '$lib/finance/permissions';
	import { billingStatusTone } from '$lib/finance/status';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock, Wallet } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { getStudentFinanceTabState } from './student-finance-tab.svelte';

	const { s }: { s: Student } = $props();

	const financesTab = getStudentFinanceTabState();
	const summary = $derived(financesTab.summaryFor(s.id));
	const statement = $derived(financesTab.statementFor(s.id));
	const currency = $derived(summary?.currency ?? statement?.currency ?? '');
	const charges = $derived(statement?.charges ?? []);
	const entries = $derived(statement?.entries ?? []);
	const accountSourceId = $derived(
		authSession.schoolId && academicContext.yearId && currency
			? studentYearAccountSourceId({
				schoolId: authSession.schoolId,
				studentId: s.id,
				academicYearId: academicContext.yearId,
				currency,
			})
			: null,
	);

	function chargeTone(status: string): string {
		if (status in billingStatusTone) {
			return billingStatusTone[status as StudentChargeStatus];
		}
		return billingStatusTone.pending;
	}
</script>

<div class="space-y-4">
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
			<p class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
				<Wallet class="h-3.5 w-3.5" />
				{$t('finance.available')}
			</p>
			<p class="mt-1 font-display text-2xl">
				{formatMinorUnits(summary?.available.amount ?? 0, currency, $locale)}
			</p>
		</div>
		<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
			<p class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
				<Check class="h-3.5 w-3.5" />
				{$t('finance.outstandingAmount')}
			</p>
			<p class="mt-1 font-display text-2xl">
				{formatMinorUnits(summary?.outstanding.amount ?? 0, currency, $locale)}
			</p>
		</div>
		<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
			<p class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
				<Clock class="h-3.5 w-3.5" />
				{$t('finance.overdueAmount')}
			</p>
			<p class="mt-1 font-display text-2xl">
				{formatMinorUnits(summary?.overdue.amount ?? 0, currency, $locale)}
			</p>
		</div>
	</div>
	<div class="flex flex-wrap gap-2">
		<DocumentPdfButton onRequestDocumentIssuance={financesTab.performRequestDocumentIssuance}
			templateKey="account-statement.v1"
			sourceId={accountSourceId}
			studentId={s.id}
			permission={FINANCIAL_REPORT_READ_PERMISSION}
			classId={s.classId}
		/>
		<DocumentPdfButton onRequestDocumentIssuance={financesTab.performRequestDocumentIssuance}
			templateKey="invoice.v1"
			sourceId={accountSourceId}
			studentId={s.id}
			permission="PAYMENT_READ"
			classId={s.classId}
		/>
		<DocumentPdfButton onRequestDocumentIssuance={financesTab.performRequestDocumentIssuance}
			templateKey="payment-reminder.v1"
			sourceId={accountSourceId}
			studentId={s.id}
			permission="PAYMENT_READ"
			classId={s.classId}
		/>
	</div>
	<div>
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('finance.billing')} · {charges.length}
		</Label>
		<div class="mt-2 space-y-2">
			{#if charges.length === 0}
				<DrawerEmptyState label={$t('finance.noInvoices')}>
					{#snippet icon()}
						<Wallet class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each charges as charge (charge.id)}
					<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
						<div class="flex items-center justify-between">
							<span
								class={cn(
									'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
									chargeTone(charge.status),
								)}
							>
								{$t(`billing.status.${charge.status}`)}
							</span>
						</div>
						<p class="mt-2 text-sm font-medium">{charge.label}</p>
						<p class="mt-1 text-xs text-muted-foreground">
							{formatMinorUnits(charge.remainingObligation, currency, $locale)}
							{$t('finance.remaining')}
						</p>
					</div>
				{/each}
			{/if}
		</div>
	</div>
	<div>
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('finance.statement')}
		</Label>
		<div class="mt-2 space-y-2">
			{#if entries.length === 0}
				<DrawerEmptyState label={$t('finance.noInvoices')}>
					{#snippet icon()}
						<Clock class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each entries as entry (entry.id)}
					<div class="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 text-xs shadow-soft">
						<div>
							<p class="font-medium">{entry.sourceKind}</p>
							<p class="font-sans tabular-nums text-[10px] text-muted-foreground">
								{fmtDateFr(entry.effectiveAt || entry.recordedAt, $locale)}
								· {entry.direction}
							</p>
						</div>
						<div class="text-right">
							<p class="font-sans tabular-nums">
								{entry.direction === 'credit' ? '+' : '−'}
								{formatMinorUnits(entry.amount, currency, $locale)}
							</p>
							<p class="font-sans tabular-nums text-[10px] text-muted-foreground">
								{formatMinorUnits(entry.resultingAvailableBalance, currency, $locale)}
							</p>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
