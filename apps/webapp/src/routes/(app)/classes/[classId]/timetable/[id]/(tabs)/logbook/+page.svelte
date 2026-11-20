<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { entityVersions } from '$lib/entity-versions.svelte';
	import { t } from '$lib/i18n';
	import { getTimetablePageState } from '../../../timetable-page.svelte';
	import SessionLogbookTab from './components/SessionLogbookTab.svelte';
	import { getSessionLogbookTabState } from './session-logbook-tab.svelte';

	const logbookTab = getSessionLogbookTabState();
	const query = logbookTab.query();
	const cacheKey = (url: URL) => `${drawerTabRouteCacheKey(url)}:${entityVersions.planning}:${entityVersions.subjects}`;
	const session = $derived(getTimetablePageState().selected);
</script>

{#if session}
	<PageQuery {query} {cacheKey} cache={false} preserveWhileLoading loadingTitle={$t('subjects.tab.logbook')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<SessionLogbookTab s={session} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
