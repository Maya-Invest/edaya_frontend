<script lang="ts">
	import type { CatalogInstallmentTemplate } from '$lib/api/finance-types';
	import type { Fee } from '$lib/types/school';
	import { CATALOG_CATEGORIES } from '$lib/api/finance-types';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { formatMinorUnits, majorToMinor, minorToMajor, parseMajorInput } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getFeesPageState } from '../fees-page.svelte';

	let { fee, open = $bindable(false), onCreated }: {
		fee?: Fee;
		open?: boolean;
		onCreated?: (feeId: string) => void;
	} = $props();
	const feesPage = getFeesPageState();
	let busy = $state(false);
	let name = $state('');
	let description = $state('');
	let singleDueDate = $state('');
	let installments = $state<CatalogInstallmentTemplate[]>([]);
	let category = $state<Fee['category']>('tuition');
	let amount = $state('0');
	let enrollmentMode = $state<Fee['enrollmentMode']>('mandatory');
	let wasOpen = $state(false);
	const isEdit = $derived(fee !== undefined);
	const currency = $derived(authSession.school?.financeCurrency ?? '');
	const parsedMajor = $derived(parseMajorInput(amount));
	const canSubmit = $derived(currency.length > 0 && name.trim().length > 0 && parsedMajor !== null && parsedMajor >= 0 && (installments.length === 0 || (installments.every(row => row.label.trim() && row.percentage > 0) && Math.abs(installments.reduce((sum, row) => sum + row.percentage, 0) - 100) < 0.001)));
	function resetForm() {
		if (fee) {
			name = fee.name;
			description = fee.description ?? '';
			singleDueDate = fee.billingTerms?.singleDueDate?.slice(0, 10) ?? '';
			installments = (fee.billingTerms?.installments ?? []).map(row => ({ ...row }));
			category = fee.category;
			amount = String(minorToMajor(fee.amount, fee.currency, $locale));
			enrollmentMode = fee.enrollmentMode;
		}
		else {
			name = '';
			description = '';
			singleDueDate = '';
			installments = [];
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
					description: description.trim() || null,
					billingTerms: { kind: 'one_time', singleDueDate: singleDueDate || null, installments },
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
					description: description.trim() || null,
					billingTerms: { kind: 'one_time', singleDueDate: singleDueDate || null, installments },
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
	{#if !currency}<p role="alert">{$t('finance.currencyRequired')}</p>{/if}
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

	<details class="space-y-3"><summary>{$t('profile.additionalFields')}</summary>
		<label class="block">{$t('profile.description')}<Textarea bind:value={description} /></label>
		<label class="block">{$t('profile.singleDueDate')}<Input type="date" bind:value={singleDueDate} /></label>
		<fieldset class="space-y-3"><legend>{$t('profile.installments')}</legend>
			{#each installments as installment, index (index)}<div class="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
				<label>{$t('profile.installmentLabel')}<Input bind:value={installment.label} /></label>
				<label>{$t('profile.percentage')}<input type="number" min="0.01" max="100" step="any" bind:value={installment.percentage} class="h-10 w-full rounded-lg border bg-background px-3" /></label>
				<label>{$t('profile.dueDate')}<Input type="date" value={installment.dueDate ?? ''} oninput={event => installment.dueDate = event.currentTarget.value || null} /></label>
				<Button variant="ghost" onclick={() => installments = installments.filter((_, i) => i !== index)}>{$t('common.delete')}</Button>
			</div>{/each}
			<p class="text-xs text-muted-foreground">{$t('profile.installmentsTotalHint')}</p>
			<Button variant="outline" onclick={() => installments = [...installments, { label: '', percentage: 100, dueDate: null }]}>{$t('common.add')}</Button>
		</fieldset>
	</details>
</FormModal>
