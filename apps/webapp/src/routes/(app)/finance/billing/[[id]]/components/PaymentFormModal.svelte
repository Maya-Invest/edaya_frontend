<script lang="ts">
	import type { StudentBilling } from '$lib/types/school';
	import RecordPaymentFormModal from '../../../components/RecordPaymentFormModal.svelte';
	import { getBillingPageState } from '../../billing-page.svelte';

	let { open = $bindable(false), billing }: { open?: boolean; billing: StudentBilling; studentName: string; feeName: string } = $props();
	const billingPage = getBillingPageState();
</script>
<RecordPaymentFormModal bind:open draft={billingPage.paymentDraft} charge={billing} onSuccess={() => billingPage.refreshSlice()} />
