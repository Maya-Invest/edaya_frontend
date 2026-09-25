<script lang="ts">
	import type { AllocationMode, AllocationPlan, AllocationPreview } from '$lib/api/finance-types';
	import type { StudentBilling } from '$lib/types/school';
	import { allocateAccountBalanceMutation, previewAccountAllocationQuery } from '$lib/api/mutations/billing-ops.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { formatMinorUnits, majorToMinor, parseMajorInput } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getBillingPageState } from '../../billing-page.svelte';

	const ALLOCATE_MODES: AllocationMode[] = ['fifo', 'targeted'];

	let {
		billing,
		open = $bindable(false),
	}: {
		billing: StudentBilling;
		open?: boolean;
	} = $props();

	const billingPage = getBillingPageState();
	const account = $derived(billingPage.accountForStudent(billing.studentId));
	const currency = $derived(billing.currency);

	let busy = $state(false);
	let mode = $state<AllocationMode>('fifo');
	let targetedAmount = $state('');
	let preview = $state<AllocationPreview | null>(null);

	const parsedMajor = $derived(parseMajorInput(targetedAmount));
	const targetedMinor = $derived(
		parsedMajor === null ? billing.remaining : majorToMinor(parsedMajor, currency, $locale),
	);

	function allocationPlan(): AllocationPlan {
		if (mode === 'targeted') {
			return {
				mode: 'targeted',
				targets: [{ chargeId: billing.id, amount: Math.max(1, Math.min(targetedMinor, billing.remaining)) }],
			};
		}
		return { mode: 'fifo' };
	}

	const canSubmit = $derived(Boolean(account) && (mode === 'fifo' || targetedMinor > 0));

	function resetForm() {
		mode = 'fifo';
		targetedAmount = '';
		preview = null;
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function refreshPreview() {
		if (!account) {
			preview = null;
			return;
		}
		preview = await previewAccountAllocationQuery({
			accountId: account.id,
			allocation: allocationPlan(),
		});
	}

	$effect(() => {
		if (!open || !account) {
			return;
		}
		void mode;
		void targetedMinor;
		void refreshPreview();
	});

	async function submit() {
		if (!canSubmit || !account) {
			return;
		}
		busy = true;
		try {
			const ok = await allocateAccountBalanceMutation({
				accountId: account.id,
				allocation: allocationPlan(),
				successMessage: get(t)('billing.allocateSuccess'),
			});
			if (ok) {
				open = false;
				await billingPage.refreshSlice();
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('billing.allocateTitle')}
	description={$t('billing.allocateDescription')}
	submitLabel={$t('billing.allocate')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
		<p class="text-[11px] uppercase tracking-wider text-muted-foreground">{$t('finance.available')}</p>
		<p class="font-sans text-xl font-semibold tabular-nums">
			{formatMinorUnits(account?.availableBalance ?? 0, currency, $locale)}
		</p>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('payment.allocationMode')}
		</Label>
		<Select.Root type="single" value={mode} onValueChange={v => v && (mode = v as AllocationMode)}>
			<Select.Trigger>
				<Select.Value>{$t(`payment.allocation.${mode}`)}</Select.Value>
			</Select.Trigger>
			<Select.Content>
				{#each ALLOCATE_MODES as option (option)}
					<Select.Item value={option} label={$t(`payment.allocation.${option}`)}>
						{$t(`payment.allocation.${option}`)}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
	{#if mode === 'targeted'}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('payment.amount')}
			</Label>
			<Input type="number" min="0" step="any" bind:value={targetedAmount} />
		</div>
	{/if}
	{#if preview}
		<div class="rounded-xl border border-border px-3 py-2 text-sm">
			<p class="text-[11px] uppercase tracking-wider text-muted-foreground">{$t('payment.preview')}</p>
			{#if preview.allocations.length === 0}
				<p class="mt-1 text-xs text-muted-foreground">{$t('billing.allocateEmptyPreview')}</p>
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
</FormModal>
