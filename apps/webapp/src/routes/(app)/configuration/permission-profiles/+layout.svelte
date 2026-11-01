<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { readPermissionProfileListFilters } from '$lib/list/list-url-filters';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import PermissionProfilesList from './components/PermissionProfilesList.svelte';
	import {
		PermissionProfilesPageState,
		setPermissionProfilesPageState,
	} from './permission-profiles-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const permissionProfilesPage = new PermissionProfilesPageState(() => $page.url);
	setPermissionProfilesPageState(permissionProfilesPage);
	registerVersionInvalidation(permissionProfilesPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = permissionProfilesPage.queryListPage();
	const urlFilters = $derived(readPermissionProfileListFilters($page.url));

	$effect(() => {
		permissionProfilesPage.filters.hydrate(urlFilters);
	});
</script>

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('config.permissionProfiles')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('permissionProfiles.subtitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<PermissionProfilesList />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
