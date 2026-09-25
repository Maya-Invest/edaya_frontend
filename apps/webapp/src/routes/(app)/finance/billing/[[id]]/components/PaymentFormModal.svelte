<script lang="ts">
	import type { AllocationMode, AllocationPlan, PaymentMethod } from '$lib/api/finance-types';
	import type { StudentBilling } from '$lib/types/school';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { previewFifoAllocation, previewTargetedAllocation } from '$lib/finance/allocation-preview';
	import { formatMinorUnits, majorToMinor, minorToMajor, parseMajorInput } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getBillingPageState } from '../../billing-page.svelte';

	const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'bank_transfer', 'mobile_money', 'other'];
	const ALLOCATION_MODES: AllocationMode[] = ['account_only', 'fifo', 'targeted'];

	let {
		billing,
		studentName,
		feeName,
		open = $bindable(false),
	}: {
		billing: StudentBilling;
		studentName: string;
		feeName: string;
		open?: boolean;
	} = $props();

	const billingPage = getBillingPageState();
	const account = $derived(billingPage.accountForStudent(billing.studentId));
	const currency = $derived(billing.currency);
	const siblingCharges = $derived(
		billingPage.billing.filter(entry => entry.studentId === billing.studentId),
	);

	let busy = $state(false);
	let amount = $state('');
	let paymentDate = $state('');
	let method = $state<PaymentMethod>('cash');
	let reference = $state('');
	let notes = $state('');
	let allocationMode = $state<AllocationMode>('targeted');
	let wasOpen = $state(false);

	const parsedMajor = $derived(parseMajorInput(amount));
	const amountMinor = $derived(parsedMajor === null ? 0 : majorToMinor(parsedMajor, currency, $locale));
	const preview = $derived.by(() => {
		if (amountMinor <= 0) {
			return null;
		}
		if (allocationMode === 'account_only') {
			return {
				accountId: account?.id ?? '',
				availableBefore: account?.availableBalance ?? 0,
				availableAfter: (account?.availableBalance ?? 0) + amountMinor,
				allocations: [],
			};
		}
		if (allocationMode === 'fifo') {
			return previewFifoAllocation(
				account?.id ?? '',
				amountMinor,
				account?.availableBalance ?? 0,
				siblingCharges,
			);
		}
		return previewTargetedAllocation(
			account?.id ?? '',
			amountMinor,
			account?.availableBalance ?? 0,
			billing,
		);
	});

	const canSubmit = $derived(
		amountMinor > 0 && paymentDate.trim().length > 0 && (allocationMode !== 'targeted' || billing.remaining > 0),
	);

	function resetForm() {
		amount = String(minorToMajor(Math.max(billing.remaining, 0), currency, $locale));
		paymentDate = new Date().toISOString().slice(0, 10);
		method = 'cash';
		reference = '';
		notes = '';
		allocationMode = billing.remaining > 0 ? 'targeted' : 'account_only';
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	function allocationPlan(): AllocationPlan {
		if (allocationMode === 'targeted') {
			const applied = Math.min(amountMinor, billing.remaining);
			return { mode: 'targeted', targets: [{ chargeId: billing.id, amount: applied }] };
		}
		return { mode: allocationMode };
	}

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		try {
			const ok = await billingPage.recordPayment({
				studentId: billing.studentId,
				accountId: account?.id,
				amount: amountMinor,
				paymentDate: new Date(`${paymentDate}T12:00:00`).toISOString(),
				method,
				reference,
				notes,
				allocation: allocationPlan(),
				successMessage: get(t)('payment.recordSuccess', {
					amount: formatMinorUnits(amountMinor, currency, $locale),
					student: studentName,
				}),
			});
			if (ok) {
				open = false;
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('payment.recordTitle')}
	description={$t('payment.recordDescription', { student: studentName, fee: feeName })}
	submitLabel={$t('finance.recordPayment')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
		<p class="text-[11px] uppercase tracking-wider text-muted-foreground">{$t('finance.remaining')}</p>
		<p class="font-sans text-xl font-semibold tabular-nums">
			{formatMinorUnits(billing.remaining, currency, $locale)}
		</p>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('payment.allocationMode')}
		</Label>
		<Select.Root type="single" value={allocationMode} onValueChange={v => v && (allocationMode = v as AllocationMode)}>
			<Select.Trigger>
				<Select.Value>{$t(`payment.allocation.${allocationMode}`)}</Select.Value>
			</Select.Trigger>
			<Select.Content>
				{#each ALLOCATION_MODES as mode (mode)}
					<Select.Item value={mode} label={$t(`payment.allocation.${mode}`)}>
						{$t(`payment.allocation.${mode}`)}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('payment.amount')}
		</Label>
		<Input type="number" min="0" step="any" bind:value={amount} />
	</div>
	{#if preview}
		<div class="rounded-xl border border-border px-3 py-2 text-sm">
			<p class="text-[11px] uppercase tracking-wider text-muted-foreground">{$t('payment.preview')}</p>
			{#if preview.allocations.length === 0}
				<p class="mt-1 text-xs text-muted-foreground">{$t('payment.previewDeposit')}</p>
			{:else}
				<ul class="mt-1 space-y-1">
					{#each preview.allocations as line (line.chargeId)}
						<li class="flex justify-between gap-2 text-xs">
							<span class="truncate">{line.label}</span>
							<span class="font-sans tabular-nums">{formatMinorUnits(line.amount, currency, $locale)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('payment.date')}
			</Label>
			<Input type="date" bind:value={paymentDate} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('payment.method')}
			</Label>
			<Select.Root type="single" value={method} onValueChange={v => v && (method = v as PaymentMethod)}>
				<Select.Trigger>
					<Select.Value>{$t(`payment.method.${method}`)}</Select.Value>
				</Select.Trigger>
				<Select.Content>
					{#each PAYMENT_METHODS as option (option)}
						<Select.Item value={option} label={$t(`payment.method.${option}`)}>
							{$t(`payment.method.${option}`)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('payment.reference')}
		</Label>
		<Input bind:value={reference} placeholder={$t('payment.referencePlaceholder')} />
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('payment.notes')}
		</Label>
		<Textarea bind:value={notes} rows={2} />
	</div>
</FormModal>
