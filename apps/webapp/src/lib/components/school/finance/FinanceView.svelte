<script lang="ts">
	import type { Fee, StudentBilling } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { Plus, TrendingUp, AlertCircle, Wallet } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import AssignFeeFormModal from './AssignFeeFormModal.svelte';
	import FeeFormModal from './FeeFormModal.svelte';

	const {
		onSelectFee,
		onSelectBilling,
		selectedId,
		forcedTab,
	}: {
		onSelectFee?: (f: Fee) => void;
		onSelectBilling?: (b: StudentBilling) => void;
		selectedId?: string;
		forcedTab?: 'fees' | 'billing';
	} = $props();

	const fees = $derived(detailDataContext.fees);
	const billing = $derived(detailDataContext.billing);
	const students = $derived(detailDataContext.students);

	const statusStyle: Record<StudentBilling['status'], string> = {
		paid: 'bg-secondary text-foreground/80',
		partial: 'bg-secondary text-foreground/80',
		due: 'bg-highlight-soft text-highlight',
		overdue: 'bg-destructive/10 text-destructive',
	};

	let internalTab = $state<'fees' | 'billing'>('billing');
	const tab = $derived(forcedTab ?? internalTab);
	const tabKeys = ['billing', 'fees'] as const;
	let createFeeOpen = $state(false);
	let assignFeeOpen = $state(false);

	function handleFeeCreated(feeId: string) {
		appGoto(detailHref.financeFee(feeId));
	}

	function handleBillingCreated(studentFeeId: string) {
		appGoto(detailHref.financeBilling(studentFeeId));
	}

	const totals = $derived.by(() => {
		const totalDue = billing.reduce((sum, b) => sum + (b.total - b.paid), 0);
		const collected = billing.reduce((sum, b) => sum + b.paid, 0);
		const overdue = billing.filter(b => b.status === 'overdue').length;
		return { totalDue, collected, overdue };
	});

	const statToneMap = {
		mint: 'bg-secondary text-foreground/80',
		warm: 'bg-highlight-soft text-highlight',
		alert: 'bg-destructive/10 text-destructive',
	} as const;
</script>

<div class="animate-fade-in space-y-6">
	{#snippet tabSwitcher()}
		{#if !forcedTab}
			<div class="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
				{#each tabKeys as k (k)}
					<button
						type="button"
						onclick={() => (internalTab = k)}
						class={cn(
							'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
							tab === k
								? 'bg-primary text-primary-foreground shadow-soft'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						{$t(`finance.${k}`)}
					</button>
				{/each}
			</div>
		{/if}
	{/snippet}

	{#if tab === 'fees'}
		<ListPageHeader
			eyebrow={$t('finance.feesCatalog')}
			title={$t('finance.fees')}
		>
			{#snippet filters()}
				{@render tabSwitcher()}
			{/snippet}
			{#snippet primary()}
				<PermissionGate
					permission="FINANCIAL_CONFIG_CONFIGURE"
					mode="disable"
					tooltip={$t('fee.permissionConfigure')}
				>
					{#snippet children({ disabled, title })}
						<Button
							size="sm"
							class="rounded-full"
							{disabled}
							{title}
							onclick={() => (createFeeOpen = true)}
						>
							<Plus class="mr-1 h-4 w-4" />
							{$t('finance.newFee')}
						</Button>
					{/snippet}
				</PermissionGate>
			{/snippet}
		</ListPageHeader>
		<FeeFormModal bind:open={createFeeOpen} onCreated={handleFeeCreated} />
	{:else}
		<ListPageHeader
			eyebrow={$t('finance.financeEyebrow')}
			title={$t('finance.title')}
		>
			{#snippet filters()}
				{@render tabSwitcher()}
			{/snippet}
			{#snippet primary()}
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
							onclick={() => (assignFeeOpen = true)}
						>
							<Plus class="mr-1 h-4 w-4" />
							{$t('finance.newInvoice')}
						</Button>
					{/snippet}
				</PermissionGate>
			{/snippet}
		</ListPageHeader>
		{#if assignFeeOpen}
			<AssignFeeFormModal
				bind:open={assignFeeOpen}
				{students}
				{fees}
				{billing}
				onCreated={handleBillingCreated}
			/>
		{/if}
	{/if}

	<div class="grid gap-3 sm:grid-cols-3">
		<div class="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
			<div class={cn('flex h-11 w-11 items-center justify-center rounded-xl', statToneMap.mint)}>
				<TrendingUp class="h-5 w-5" />
			</div>
			<div>
				<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
					{$t('finance.collected')}
				</p>
				<p class="font-display text-2xl font-semibold tabular-nums">
					{totals.collected.toLocaleString()} FCFA
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
				<p class="font-display text-2xl font-semibold tabular-nums">
					{totals.totalDue.toLocaleString()} FCFA
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
				<p class="font-display text-2xl font-semibold tabular-nums">{totals.overdue}</p>
			</div>
		</div>
	</div>

	{#if tab === 'billing'}
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
					{#each billing as b (b.id)}
						{@const student = students.find(s => s.id === b.studentId)}
						{@const fee = fees.find(f => f.id === b.feeId)}
						{#if student && fee}
							{@const pct = (b.paid / b.total) * 100}
							{@const active = selectedId === b.id}
							<li>
								<button
									type="button"
									onclick={() => onSelectBilling?.(b)}
									class={cn(
										'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0',
										active ? 'bg-primary/10' : 'hover:bg-secondary',
									)}
								>
									<div class="col-span-4 flex items-center gap-3">
										<div
											class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-xs font-semibold text-primary-foreground"
										>
											{student.initials}
										</div>
										<div class="min-w-0">
											<p class="truncate text-sm font-medium">{student.name}</p>
											<p
												class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
											>
												{student.classId}
											</p>
										</div>
									</div>
									<div class="col-span-3">
										<p class="truncate text-sm">{fee.name}</p>
										<p
											class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
										>
											{$t(`feeCat.${fee.category}`)} · {$t(`feePeriod.${fee.period}`)}
										</p>
									</div>
									<div class="col-span-2">
										<p class="font-mono text-xs">
											{b.paid.toLocaleString()} / {b.total.toLocaleString()} FCFA
										</p>
										<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
											<div
												class={cn(
													'h-full rounded-full',
													b.status === 'overdue' ? 'bg-destructive' : 'bg-accent',
												)}
												style:width="{pct}%"
											></div>
										</div>
									</div>
									<div class="col-span-2 text-xs text-foreground/70">
										{new Date(b.dueDate).toLocaleDateString($locale, {
											day: 'numeric',
											month: 'short',
											year: 'numeric',
										})}
									</div>
									<div class="col-span-1 flex justify-end">
										<span
											class={cn(
												'rounded-full px-2 py-1 text-[10px] font-medium uppercase',
												statusStyle[b.status],
											)}
										>
											{$t(`billing.status.${b.status}`)}
										</span>
									</div>
								</button>
							</li>
						{/if}
					{/each}
				{/if}
			</ul>
		</div>
	{:else}
		<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
			{#if fees.length === 0}
				<p class="col-span-full py-12 text-center text-sm text-muted-foreground">
					{$t('dataState.emptyDescription')}
				</p>
			{:else}
				{#each fees as f (f.id)}
					{@const active = selectedId === f.id}
					{@const usage = billing.filter(b => b.feeId === f.id).length}
					<button
						type="button"
						onclick={() => onSelectFee?.(f)}
						class={cn(
							'rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-panel',
							active && 'border-primary/40 bg-primary/5',
						)}
					>
						<div class="flex items-start justify-between">
							<span
								class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
							>
								{$t(`feeCat.${f.category}`)}
							</span>
							<span class="font-mono text-[10px] uppercase text-muted-foreground">
								/ {$t(
									`feePeriod.${f.period.toLowerCase() === 'year' ? 'year' : f.period.toLowerCase() === 'term' ? 'term' : 'month'}`,
								)}
							</span>
						</div>
						<h3 class="mt-3 font-display text-lg font-semibold">{f.name}</h3>
						<p class="mt-2 font-display text-3xl font-semibold tabular-nums">
							{f.amount.toLocaleString()} FCFA
						</p>
						<p class="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
							{$t('finance.appliedTo')}
							<span class="font-medium text-foreground">{usage}</span>
							{usage !== 1 ? $t('finance.studentsLower') : $t('finance.studentLower')}
						</p>
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>
