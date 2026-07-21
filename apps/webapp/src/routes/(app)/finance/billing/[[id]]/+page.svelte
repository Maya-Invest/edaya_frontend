<script lang="ts">
	import { getBillingPageState } from '../billing-page.svelte';
	import BillingDetail from './components/BillingDetail.svelte';

	const billingPage = getBillingPageState();
	const billing = $derived(billingPage.selected);
</script>

{#if billing}
	<BillingDetail {billing} />
{/if}
