<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import SchoolSettingsView from './components/SchoolSettingsView.svelte';
	import {
		SchoolPageState,
		setSchoolPageState,
	} from './school-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const schoolPage = new SchoolPageState();
	setSchoolPageState(schoolPage);
	registerVersionInvalidation(schoolPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = schoolPage.queryListPage();
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('schoolSettings.title')}>
	{#snippet children(data)}
		<DataState
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('schoolSettings.title')}
			emptyDescription={$t('schoolSettings.emptyDescription')}
		>
			<SchoolSettingsView />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
