<script lang="ts">

	import type { FinancePayment } from '$lib/api/finance-data';
	import { financeReadKey, readPaymentsPage } from '$lib/api/finance-workspace';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
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
	let payment = $state<FinancePayment | null>(null);
	let loading = $state(false);
	$effect(() => {
		if (!open)
			return;
		const id = paymentId;
		const key = financeReadKey(`payment:${id}`);
		let cancelled = false;
		payment = null;
		loading = true;
		void readPaymentsPage({ paymentId: id }).then((result) => {
			if (!cancelled && key === financeReadKey(`payment:${id}`))
				payment = result.rows[0] ?? null;
		}).catch(() => {
			if (!cancelled)
				payment = null;
		}).finally(() => {
			if (!cancelled)
				loading = false;
		});
		return () => {
			cancelled = true;
		};
	});
	const canReverse = $derived(Boolean(payment && payment.kind === 'receipt' && payment.status === 'recorded' && hasPermission('PAYMENT_REVERSE', { studentId: payment.studentId, classId: payment.classId })));

	async function submit() {
		if (busy || loading || !canReverse) {
			return;
		}
		busy = true;
		try {
			const ok = await paymentPage.performReversePayment({
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
	description={loading ? $t('dataState.loading') : canReverse ? $t('payment.reverseConfirm') : $t('finance.actionUnavailable')}
	submitLabel={$t('payment.reverse')}
	cancelLabel={$t('common.cancel')}
	{busy}
	submitDisabled={loading || !canReverse}
	onSubmit={submit}
/>
