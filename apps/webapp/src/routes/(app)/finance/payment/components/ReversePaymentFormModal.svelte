<script lang="ts">
	import { reversePaymentMutation } from '$lib/api/mutations/billing-ops.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getPaymentPageState } from '../payment-page.svelte';

	let {
		paymentId,
		open = $bindable(false),
	}: {
		paymentId: string;
		open?: boolean;
	} = $props();

	const paymentPage = getPaymentPageState();
	let busy = $state(false);

	async function submit() {
		if (paymentId.length === 0) {
			return;
		}
		busy = true;
		try {
			const ok = await reversePaymentMutation({
				paymentId,
				successMessage: get(t)('payment.reverseSuccess'),
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
	title={$t('payment.reverseTitle')}
	description={$t('payment.reverseConfirm')}
	submitLabel={$t('payment.reverse')}
	cancelLabel={$t('common.cancel')}
	{busy}
	submitDisabled={paymentId.length === 0}
	onSubmit={submit}
/>
