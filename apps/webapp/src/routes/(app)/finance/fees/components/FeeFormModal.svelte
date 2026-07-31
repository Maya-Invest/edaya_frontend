<script lang="ts">
	import type { Fee } from '$lib/types/school';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getFeesPageState } from '../fees-page.svelte';

	const FEE_CATEGORIES: Fee['category'][] = ['Tuition', 'Transport', 'Materials', 'Other'];
	const FEE_PERIODS: NonNullable<Fee['period']>[] = ['Year', 'Term', 'Month'];

	let {
		fee,
		open = $bindable(false),
		onCreated,
	}: {
		fee?: Fee;
		open?: boolean;
		onCreated?: (feeId: string) => void;
	} = $props();

	const feesPage = getFeesPageState();

	let busy = $state(false);
	let name = $state('');
	let category = $state<Fee['category']>('Tuition');
	let amount = $state('0');
	let period = $state<NonNullable<Fee['period']>>('Term');

	const isEdit = $derived(fee !== undefined);
	const numericAmount = $derived(Number.parseFloat(amount));
	const canSubmit = $derived(name.trim().length > 0 && Number.isFinite(numericAmount) && numericAmount > 0);

	function resetForm() {
		if (fee) {
			name = fee.name;
			category = fee.category;
			amount = String(fee.amount);
			period = fee.period ?? 'Term';
		}
		else {
			name = '';
			category = 'Tuition';
			amount = '0';
			period = 'Term';
		}
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		try {
			if (fee) {
				const ok = await feesPage.updateFee({
					feeId: fee.id,
					name,
					category,
					amount: numericAmount,
					successMessage: get(t)('fee.updateSuccess', { name: name.trim() }),
				});
				if (ok) {
					open = false;
				}
			}
			else {
				const feeId = await feesPage.createFee({
					name,
					category,
					amount: numericAmount,
					period,
					successMessage: get(t)('fee.createSuccess', { name: name.trim() }),
				});
				if (feeId) {
					open = false;
					resetForm();
					onCreated?.(feeId);
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
	title={isEdit ? $t('fee.editTitle') : $t('fee.createTitle')}
	description={isEdit ? fee?.name : $t('fee.createDescription')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('fee.name')}
		</Label>
		<Input bind:value={name} />
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('fee.category')}
			</Label>
			<Select.Root type="single" value={category} onValueChange={v => v && (category = v as Fee['category'])}>
				<Select.Trigger>
					<Select.Value>
						{$t(`feeCat.${category}`)}
					</Select.Value>
				</Select.Trigger>
				<Select.Content>
					{#each FEE_CATEGORIES as cat (cat)}
						<Select.Item value={cat} label={$t(`feeCat.${cat}`)}>{$t(`feeCat.${cat}`)}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		{#if !isEdit}
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('fee.period')}
				</Label>
				<Select.Root type="single" value={period} onValueChange={v => v && (period = v as NonNullable<Fee['period']>)}>
					<Select.Trigger>
						<Select.Value>
							{$t(`feePeriod.${period}`)}
						</Select.Value>
					</Select.Trigger>
					<Select.Content>
						{#each FEE_PERIODS as p (p)}
							<Select.Item value={p} label={$t(`feePeriod.${p}`)}>{$t(`feePeriod.${p}`)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/if}
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('fee.amount')}
		</Label>
		<Input type="number" min="0" step="100" bind:value={amount} />
	</div>
</FormModal>
