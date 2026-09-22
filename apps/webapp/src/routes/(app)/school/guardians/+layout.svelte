<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { readGuardianListFilters } from '$lib/list/list-url-filters';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import GuardiansList from './components/GuardiansList.svelte';
	import {
		GuardiansPageState,
		setGuardiansPageState,
	} from './guardians-page.svelte';
	import { guardianListUsesFullRoster } from './lib/guardian-list-filters';

	const { children: pageChildren }: { children: Snippet } = $props();

	const guardiansPage = new GuardiansPageState(() => $page.url);
	setGuardiansPageState(guardiansPage);
	registerVersionInvalidation(guardiansPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = guardiansPage.queryListPage();
	const urlFilters = $derived(readGuardianListFilters($page.url));

	let wasFullRoster = false;

	$effect(() => {
		guardiansPage.filters.hydrate(urlFilters);
	});

	$effect(() => {
		if (!guardiansPage.filters.ready) {
			return;
		}
		void guardiansPage.filters.values.q;
		void guardiansPage.filters.values.sort;

		if (!guardianListUsesFullRoster(guardiansPage.filters.values)) {
			guardiansPage.clearFullRoster();
			if (wasFullRoster) {
				void guardiansPage.refreshList();
			}
			wasFullRoster = false;
			return;
		}

		wasFullRoster = true;
		void guardiansPage.loadFullRoster();
	});

	function selectGuardian(guardian: Guardian) {
		const path = detailHref.schoolGuardian(guardian.id);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<PageQuery {query} loadingTitle={$t('school.guardians')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.guardians')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<GuardiansList onSelect={selectGuardian} selectedId={guardiansPage.selectedId} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
