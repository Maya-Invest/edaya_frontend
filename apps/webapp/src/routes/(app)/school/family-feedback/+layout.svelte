<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { CampaignHistoryRow } from './lib/family-feedback-history.svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readFamilyFeedbackListFilters } from '$lib/list/list-url-filters';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import { onDestroy, untrack } from 'svelte';
	import FamilyFeedbackList from './components/FamilyFeedbackList.svelte';
	import {
		FamilyFeedbackPageState,
		setFamilyFeedbackPageState,
	} from './family-feedback-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const familyFeedbackPage = new FamilyFeedbackPageState(() => $page.url);
	setFamilyFeedbackPageState(familyFeedbackPage);
	onDestroy(() => familyFeedbackPage.history.clear());
	registerVersionInvalidation(familyFeedbackPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = familyFeedbackPage.queryListPage();
	const urlFilters = $derived(readFamilyFeedbackListFilters($page.url));

	$effect(() => {
		const incoming = urlFilters;
		untrack(() => familyFeedbackPage.filters.hydrate(incoming));
	});

	function selectCampaign(campaign: CampaignHistoryRow) {
		const path = detailHref.schoolFamilyFeedback(campaign.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} cache={false} preserveWhileLoading loadingSurfaceKey={listRouteCacheKey} cacheKey={url => listRouteCacheKey(url) + familyFeedbackPage.history.key} loadingTitle={$t('school.familyFeedback')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={familyFeedbackPage.history.denied ? 'denied' : data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.familyFeedback')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<FamilyFeedbackList onSelect={selectCampaign} selectedId={familyFeedbackPage.selectedId} />
		</DataState>
	{/snippet}
</PageQuery>

{@render pageChildren?.()}
