<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getBillingPageState } from '../billing-page.svelte';
	import BillingDrawer from './components/BillingDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const billingPage = getBillingPageState();
	const billing = $derived(billingPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/finance/billing/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
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
