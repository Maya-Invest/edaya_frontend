<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getEventsPageState } from '../events-page.svelte';
	import IncidentDetail from './components/IncidentDetail.svelte';

	const eventsPage = getEventsPageState();
	const incident = $derived(eventsPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/events/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}
</script>

{#if incident}
	<IncidentDetail {incident} onDeleted={closeDetail} />
{/if}
