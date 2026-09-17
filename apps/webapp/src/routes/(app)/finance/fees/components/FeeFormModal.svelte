<script lang="ts">
	import type { Fee } from '$lib/types/school';
	import { CATALOG_CATEGORIES } from '$lib/api/finance-types';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { formatMinorUnits, majorToMinor, minorToMajor, parseMajorInput } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getFeesPageState } from '../fees-page.svelte';

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
	let category = $state<Fee['category']>('tuition');
	let amount = $state('0');
	let enrollmentMode = $state<Fee['enrollmentMode']>('mandatory');
	let wasOpen = $state(false);

	const isEdit = $derived(fee !== undefined);
	const currency = $derived(fee?.currency || feesPage.fees[0]?.currency || 'XOF');
	const parsedMajor = $derived(parseMajorInput(amount));
	const canSubmit = $derived(name.trim().length > 0 && parsedMajor !== null && parsedMajor > 0);

	function resetForm() {
		if (fee) {
			name = fee.name;
			category = fee.category;
			amount = String(minorToMajor(fee.amount, fee.currency, $locale));
			enrollmentMode = fee.enrollmentMode;
		}
		else {
			name = '';
			category = 'tuition';
			amount = '0';
			enrollmentMode = 'mandatory';
		}
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit || parsedMajor === null) {
			return;
		}

		const amountMinor = majorToMinor(parsedMajor, currency, $locale);
		busy = true;
		try {
			if (fee) {
				const ok = await feesPage.updateFee({
					feeId: fee.id,
					name,
					category,
					amount: amountMinor,
					enrollmentMode,
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
					amount: amountMinor,
					currency,
					enrollmentMode,
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
		<Label for={isEdit ? 'fee-edit-name' : 'fee-create-name'} class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('fee.name')}
		</Label>
		<Input id={isEdit ? 'fee-edit-name' : 'fee-create-name'} bind:value={name} />
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
					{#each CATALOG_CATEGORIES as cat (cat)}
						<Select.Item value={cat} label={$t(`feeCat.${cat}`)}>{$t(`feeCat.${cat}`)}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('fee.enrollmentMode')}
			</Label>
			<Select.Root
				type="single"
				value={enrollmentMode}
				onValueChange={v => v && (enrollmentMode = v as Fee['enrollmentMode'])}
			>
				<Select.Trigger>
					<Select.Value>
						{$t(`fee.enrollmentMode.${enrollmentMode}`)}
					</Select.Value>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="mandatory" label={$t('fee.enrollmentMode.mandatory')}>
						{$t('fee.enrollmentMode.mandatory')}
					</Select.Item>
					<Select.Item value="opt_in" label={$t('fee.enrollmentMode.opt_in')}>
						{$t('fee.enrollmentMode.opt_in')}
					</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>
	<div class="space-y-1.5">
		<Label for={isEdit ? 'fee-edit-amount' : 'fee-create-amount'} class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('fee.amount')}
		</Label>
		<Input id={isEdit ? 'fee-edit-amount' : 'fee-create-amount'} type="number" min="0" step="any" bind:value={amount} />
		<p class="text-xs text-muted-foreground">
			{formatMinorUnits(parsedMajor !== null ? majorToMinor(parsedMajor, currency, $locale) : 0, currency, $locale)}
		</p>
	</div>
</FormModal>
