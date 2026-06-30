<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { StudentBilling } from '$lib/types/school';
	import { recordPaymentMutation } from '$lib/api/mutations/billing.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	type PaymentMethod = components['schemas']['RecordPaymentCommand']['method'];

	const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'bank_transfer', 'mobile_money', 'other'];

	let {
		billing,
		studentName,
		feeName,
		open = $bindable(false),
		disabled = false,
		title,
	}: {
		billing: StudentBilling;
		studentName: string;
		feeName: string;
		open?: boolean;
		disabled?: boolean;
		title?: string;
	} = $props();

	let busy = $state(false);
	let amount = $state('');
	let paymentDate = $state('');
	let method = $state<PaymentMethod>('cash');
	let reference = $state('');
	let notes = $state('');

	const remaining = $derived(billing.total - billing.paid);
	const numericAmount = $derived(Number.parseFloat(amount));
	const canSubmit = $derived(
		Number.isFinite(numericAmount) && numericAmount > 0 && numericAmount <= remaining && paymentDate.trim().length > 0,
	);

	function resetForm() {
		amount = String(remaining);
		paymentDate = new Date().toISOString().slice(0, 10);
		method = 'cash';
		reference = '';
		notes = '';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		try {
			const ok = await recordPaymentMutation({
				studentFeeId: billing.id,
				amount: numericAmount,
				paymentDate: new Date(`${paymentDate}T12:00:00`).toISOString(),
				method,
				reference,
				notes,
				successMessage: get(t)('payment.recordSuccess', {
					amount: numericAmount.toLocaleString(),
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

<Button
	class="w-full rounded-full"
	{disabled}
	{title}
	onclick={() => (open = true)}
>
	<span class="mr-1">💳</span>
	{$t('finance.recordPayment')}
</Button>

<FormModal
	bind:open
	title={$t('payment.recordTitle')}
	description={$t('payment.recordDescription', { student: studentName, fee: feeName })}
	submitLabel={$t('finance.recordPayment')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
		<p class="text-[11px] uppercase tracking-wider text-muted-foreground">{$t('finance.remaining')}</p>
		<p class="font-display text-xl font-semibold tabular-nums">{remaining.toLocaleString()} FCFA</p>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('payment.amount')}
		</Label>
		<Input type="number" min="0" max={remaining} step="100" bind:value={amount} />
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
					<Select.Value>
						{$t(`payment.method.${method}`)}
					</Select.Value>
				</Select.Trigger>
				<Select.Content>
					{#each PAYMENT_METHODS as m (m)}
						<Select.Item value={m} label={$t(`payment.method.${m}`)}>
							{$t(`payment.method.${m}`)}
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
