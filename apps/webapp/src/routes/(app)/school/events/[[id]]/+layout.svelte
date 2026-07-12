<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getEventsPageState } from '../events-page.svelte';
	import IncidentDrawer from './components/IncidentDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const eventsPage = getEventsPageState();
	const incident = $derived(eventsPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/events/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		const incidentId = $page.params.id;
		if (!incidentId) {
			return;
		}
		if (!eventsPage.findIncident(incidentId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<IncidentDrawer
		{incident}
		loading={!incident}
		onClose={closeDetail}
	>
		{@render children()}
	</IncidentDrawer>
{/if}
