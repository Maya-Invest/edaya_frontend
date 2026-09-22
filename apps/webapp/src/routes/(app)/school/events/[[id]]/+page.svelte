<script lang="ts">
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getEventsPageState } from '../events-page.svelte';
	import IncidentDetail from './components/IncidentDetail.svelte';

	const eventsPage = getEventsPageState();
	const incident = $derived(eventsPage.selected);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/events/[[id]]'), $page.url));
	}
</script>

{#if incident}
	<IncidentDetail {incident} onDeleted={closeDetail} />
{/if}
