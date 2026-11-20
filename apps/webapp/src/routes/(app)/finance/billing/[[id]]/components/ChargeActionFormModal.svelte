<script lang="ts">
	import type { StudentBilling } from '$lib/types/school';

	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { formatMinorUnits, majorToMinor, parseMajorInput } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { getBillingPageState } from '../../billing-page.svelte';

	let {
		billing,
		kind,
		open = $bindable(false),
	}: {
		billing: StudentBilling;
		kind: 'waive' | 'adjust' | 'cancel';
		open?: boolean;
	} = $props();

	const billingPage = getBillingPageState();
	const currency = $derived(billing.currency);

	let busy = $state(false);
	let reason = $state('');
	let amount = $state('');

	const parsedMajor = $derived(parseMajorInput(amount));
	const needsAmount = $derived(kind === 'adjust');
	const canSubmit = $derived(
		reason.trim().length > 0 && (!needsAmount || (parsedMajor !== null && parsedMajor > 0)),
	);

	function resetForm() {
		reason = '';
		amount = '';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (busy || !canSubmit || !hasPermission('PAYMENT_RECORD', { studentId: billing.studentId, classId: billing.classId }) || billing.status === 'cancelled' || (kind === 'cancel' ? !hasPermission('PAYMENT_CANCEL', { studentId: billing.studentId, classId: billing.classId }) || billing.paid > 0 : billing.remaining <= 0 || (kind === 'adjust' ? Boolean(billing.adjustedAt) : Boolean(billing.waivedAt))) || (parsedMajor !== null && majorToMinor(parsedMajor, currency, $locale) > billing.remaining)) {
			return;
		}
		busy = true;
		try {
			let ok = false;
			if (kind === 'waive') {
				const waiverAmount = parsedMajor === null
					? undefined
					: majorToMinor(parsedMajor, currency, $locale);
				ok = await billingPage.performWaiveStudentCharge({
					chargeId: billing.id,
					reason: reason.trim(),
					waiverAmount,
					successMessage: get(t)('billing.waiveSuccess'),
				});
			}
			else if (kind === 'adjust') {
				ok = await billingPage.performAdjustStudentCharge({
					chargeId: billing.id,
					adjustmentAmount: majorToMinor(parsedMajor ?? 0, currency, $locale),
					reason: reason.trim(),
					successMessage: get(t)('billing.adjustSuccess'),
				});
			}
			else {
				ok = await billingPage.performCancelStudentCharge({
					chargeId: billing.id,
					reason: reason.trim(),
					successMessage: get(t)('billing.cancelSuccess'),
				});
			}
			if (ok) {
				open = false;
				await billingPage.refreshSlice();
			}
		}
		finally {
			busy = false;
		}
	}

	const title = $derived($t(`billing.${kind}Title`));
</script>

<FormModal
	bind:open
	{title}
	description={formatMinorUnits(billing.remaining, currency, $locale)}
	submitLabel={$t(`billing.${kind}`)}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	{#if kind === 'adjust' || kind === 'waive'}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('payment.amount')}
			</Label>
			<Input type="number" min="0" step="any" bind:value={amount} />
			{#if kind === 'waive'}
				<p class="text-xs text-muted-foreground">{$t('billing.waiveAmountHint')}</p>
			{/if}
		</div>
	{/if}
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('billing.reason')}
		</Label>
		<Textarea bind:value={reason} rows={3} />
	</div>
</FormModal>
