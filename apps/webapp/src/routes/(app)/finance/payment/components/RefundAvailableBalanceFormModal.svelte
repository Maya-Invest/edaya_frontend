<script lang="ts">
	import type { StudentYearAccountView } from '$lib/api/finance-data';
	import type { PaymentMethod } from '$lib/api/finance-types';
	import { refundAvailableBalanceMutation } from '$lib/api/mutations/billing-ops.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { formatMinorUnits, majorToMinor, minorToMajor, parseMajorInput } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getPaymentPageState } from '../payment-page.svelte';

	const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'bank_transfer', 'mobile_money', 'other'];

	let {
		open = $bindable(false),
	}: {
		open?: boolean;
	} = $props();

	const paymentPage = getPaymentPageState();
	const refundableAccounts = $derived(paymentPage.accounts.filter(account => account.availableBalance > 0));

	let busy = $state(false);
	let accountId = $state('');
	let amount = $state('');
	let paymentDate = $state('');
	let method = $state<PaymentMethod>('cash');
	let reference = $state('');
	let notes = $state('');
	let wasOpen = $state(false);

	const selectedAccount = $derived(refundableAccounts.find(account => account.id === accountId));
	const currency = $derived(selectedAccount?.currency ?? '');
	const parsedMajor = $derived(parseMajorInput(amount));
	const amountMinor = $derived(parsedMajor === null ? 0 : majorToMinor(parsedMajor, currency, $locale));
	const canSubmit = $derived(Boolean(selectedAccount) && amountMinor > 0 && amountMinor <= (selectedAccount?.availableBalance ?? 0) && paymentDate.trim().length > 0);

	function accountLabel(account: StudentYearAccountView): string {
		const student = paymentPage.students.find(entry => entry.id === account.studentId);
		return `${student?.name ?? '—'} · ${formatMinorUnits(account.availableBalance, account.currency, $locale)}`;
	}

	const selectedAccountLabel = $derived(selectedAccount ? accountLabel(selectedAccount) : '');

	function amountFromAccount(account: StudentYearAccountView | undefined) {
		if (!account) {
			return '';
		}
		return String(minorToMajor(account.availableBalance, account.currency, $locale));
	}

	function selectAccount(id: string) {
		accountId = id;
		amount = amountFromAccount(refundableAccounts.find(account => account.id === id));
	}

	function resetForm() {
		const first = refundableAccounts[0];
		accountId = first?.id ?? '';
		amount = amountFromAccount(first);
		paymentDate = new Date().toISOString().slice(0, 10);
		method = 'cash';
		reference = '';
		notes = '';
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit || !selectedAccount) {
			return;
		}
		busy = true;
		try {
			const ok = await refundAvailableBalanceMutation({
				accountId: selectedAccount.id,
				amount: amountMinor,
				paymentDate: new Date(`${paymentDate}T12:00:00`).toISOString(),
				method,
				reference,
				notes,
				successMessage: get(t)('payment.refundSuccess'),
			});
			if (ok) {
				open = false;
				await paymentPage.refreshSlice();
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('payment.refundTitle')}
	description={$t('payment.refundDescription')}
	submitLabel={$t('payment.refund')}
	cancelLabel={$t('common.cancel')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('events.student')}
		</Label>
		{#if refundableAccounts.length === 0}
			<p class="rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
				{$t('payment.refundEmpty')}
			</p>
		{:else}
			<Select.Root type="single" value={accountId} onValueChange={value => value && selectAccount(value)}>
				<Select.Trigger>
					<Select.Value>{selectedAccountLabel}</Select.Value>
				</Select.Trigger>
				<Select.Content>
					{#each refundableAccounts as account (account.id)}
						<Select.Item value={account.id} label={accountLabel(account)}>
							{accountLabel(account)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>
	{#if selectedAccount}
		<div class="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
			<p class="text-[11px] uppercase tracking-wider text-muted-foreground">{$t('finance.available')}</p>
			<p class="font-sans text-xl font-semibold tabular-nums">
				{formatMinorUnits(selectedAccount.availableBalance, currency, $locale)}
			</p>
		</div>
	{/if}
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('payment.amount')}
		</Label>
		<Input type="number" min="0" step="any" bind:value={amount} />
	</div>
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
