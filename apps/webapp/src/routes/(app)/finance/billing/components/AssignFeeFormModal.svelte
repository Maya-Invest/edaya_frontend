<script lang="ts">
	import { FINANCE_BATCH_ENROLL_LIMIT } from '$lib/api/finance-types';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { formatMinorUnits, majorToMinor, parseMajorInput } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { get } from 'svelte/store';
	import { getBillingPageState } from '../billing-page.svelte';

	let {
		open = $bindable(false),
		onCreated,
	}: {
		open?: boolean;
		onCreated?: (chargeId: string) => void;
	} = $props();

	const billingPage = getBillingPageState();
	const fees = $derived(billingPage.fees.filter(fee => fee.status === 'active'));
	const billing = $derived(billingPage.billing);

	let busy = $state(false);
	let batch = $state(false);
	let studentId = $state('');
	let studentIds = $state<string[]>([]);
	let catalogServiceId = $state('');
	let customAmount = $state('');
	let dueDate = $state('');
	let wasOpen = $state(false);

	const selectedFee = $derived(fees.find(entry => entry.id === catalogServiceId));
	const selectedFeeLabel = $derived(selectedFee?.name ?? '');
	const defaultAmount = $derived(selectedFee?.amount ?? 0);
	const currency = $derived(selectedFee?.currency ?? '');
	const parsedOverride = $derived(customAmount.trim() === '' ? null : parseMajorInput(customAmount));
	const selectedCount = $derived(batch ? studentIds.length : (studentId ? 1 : 0));
	const canSubmit = $derived.by(() => {
		if (catalogServiceId.length === 0) {
			return false;
		}
		if (selectedCount <= 0 || selectedCount > FINANCE_BATCH_ENROLL_LIMIT) {
			return false;
		}
		if (parsedOverride !== null && parsedOverride <= 0) {
			return false;
		}
		return Boolean(selectedFee);
	});

	function firstAvailableService() {
		return fees[0]?.id ?? '';
	}

	function resetForm() {
		batch = false;
		studentId = '';
		studentIds = [];
		catalogServiceId = firstAvailableService();
		customAmount = '';
		dueDate = '';
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit || !selectedFee) {
			return;
		}

		const priceOverride = parsedOverride === null
			? undefined
			: majorToMinor(parsedOverride, currency, $locale);
		const due = dueDate.trim() ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined;
		busy = true;
		try {
			if (batch) {
				const ok = await billingPage.enrollStudents({
					catalogServiceId,
					studentIds,
					priceOverride,
					dueDate: due,
					successMessage: get(t)('invoice.batchSuccess', { n: studentIds.length }),
				});
				if (ok) {
					open = false;
				}
			}
			else {
				const chargeId = await billingPage.enrollStudent({
					studentId,
					catalogServiceId,
					priceOverride,
					dueDate: due,
					successMessage: get(t)('invoice.createSuccess', {
						student: billingPage.studentFor(studentId)?.name ?? studentId,
					}),
				});
				if (chargeId) {
					open = false;
					onCreated?.(chargeId);
				}
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('invoice.createTitle')}
	description={$t('invoice.createDescription')}
	submitLabel={$t('finance.newInvoice')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" bind:checked={batch} />
		{$t('invoice.batchToggle')}
	</label>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('events.student')}
		</Label>
		{#if batch}
			<StudentPicker
				bind:values={studentIds}
				mode="multi"
				active={open}
				excludeIds={billing.filter(entry => entry.catalogServiceId === catalogServiceId).map(entry => entry.studentId)}
			/>
			<p class="text-xs text-muted-foreground">
				{$t('invoice.batchLimit', { n: selectedCount, max: FINANCE_BATCH_ENROLL_LIMIT })}
			</p>
		{:else}
			<StudentPicker bind:value={studentId} active={open} />
		{/if}
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('billing.fee')}
		</Label>
		{#if fees.length === 0}
			<p class="rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
				{$t('invoice.noFeesAvailable')}
			</p>
		{:else}
			<Select.Root type="single" value={catalogServiceId} onValueChange={value => value && (catalogServiceId = value)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('invoice.selectFee')}>
						{selectedFeeLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each fees as fee (fee.id)}
						<Select.Item value={fee.id} label={fee.name}>
							{fee.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>
	{#if selectedFee}
		<div class="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
			<p class="text-[11px] uppercase tracking-wider text-muted-foreground">{$t('invoice.defaultAmount')}</p>
			<p class="font-sans text-xl font-semibold tabular-nums">
				{formatMinorUnits(defaultAmount, currency, $locale)}
			</p>
		</div>
	{/if}
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('invoice.customAmount')}
		</Label>
		<Input type="number" min="0" step="any" bind:value={customAmount} />
		<p class="text-xs text-muted-foreground">{$t('invoice.customAmountHint')}</p>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('billing.due')}
		</Label>
		<Input type="date" bind:value={dueDate} />
		<p class="text-xs text-muted-foreground">{$t('invoice.dueDateHint')}</p>
	</div>
</FormModal>
