<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getEventsPageState } from '../events-page.svelte';
	import IncidentDrawer from './components/IncidentDrawer.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const eventsPage = getEventsPageState();
	const incident = $derived(eventsPage.selected);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/events/[[id]]'), $page.url));
	}

	$effect(() => {
		const incidentId = $page.params.id;
		if (!incidentId) {
			return;
		}
		if (eventsPage.findIncident(incidentId)) {
			return;
		}
		let cancelled = false;
		void eventsPage.ensureDrawerSelection(incidentId).then((found) => {
			if (!cancelled && !found) {
				closeDetail();
			}
		});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if $page.params.id}
	<PageQuery query={eventsPage.queryDetail} cache={false} cacheKey={url => url.pathname}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<IncidentDrawer
					{incident}
					loading={!incident}
					onClose={closeDetail}
				>
					{@render pageChildren()}
				</IncidentDrawer>
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
