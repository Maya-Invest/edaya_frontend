<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import { untrack } from 'svelte';
	import FeesList from './components/FeesList.svelte';
	import {
		FeesPageState,
		setFeesPageState,
	} from './fees-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const feesPage = new FeesPageState();
	setFeesPageState(feesPage);
	let scopeGeneration = academicContext.scopeGeneration;
	$effect(() => {
		if (scopeGeneration !== academicContext.scopeGeneration) {
			scopeGeneration = academicContext.scopeGeneration;
			untrack(() => {
				feesPage.clear();
				if ($page.params.feeId)
					closeDetailDrawer(listSurfaceHref('/finance/fees', $page.url));
			});
		}
	});
	$effect(() => {
		const feeId = $page.params.feeId || feesPage.autoBillingFeeId;
		const scopeKey = feesPage.autoBilling.scopeKey;
		if (feeId && scopeKey)
			return untrack(() => feesPage.autoBilling.watch(feeId));
	});
	registerVersionInvalidation(feesPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

</script>

<FeesList />
{@render pageChildren()}
