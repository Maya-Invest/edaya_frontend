<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getBillingPageState } from '../billing-page.svelte';
	import BillingDrawer from './components/BillingDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const billingPage = getBillingPageState();
	const billing = $derived(billingPage.selected);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/finance/billing/[[id]]'), $page.url));
	}

	$effect(() => {
		const billingId = $page.params.id;
		if (!billingId) {
			return;
		}
		if (billingPage.slice && !billingPage.selectedBilling(billingId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<BillingDrawer
		{billing}
		loading={!billing}
		onClose={closeDetail}
	>
		{@render children()}
	</BillingDrawer>
{/if}
