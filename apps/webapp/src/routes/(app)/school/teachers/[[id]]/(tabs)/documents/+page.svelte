<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { entityVersions } from '$lib/entity-versions.svelte';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherDocumentsTab from './components/TeacherDocumentsTab.svelte';
	import { getTeacherDocumentsTabState } from './teacher-documents-tab.svelte';

	const documentsTab = getTeacherDocumentsTabState();
	registerVersionInvalidation(documentsTab);
	const query = documentsTab.query();
	const teacher = $derived(getTeachersPageState().selected);
	const cacheKey = $derived((url: URL) => `${drawerTabRouteCacheKey(url)}:${entityVersions.documents}`);
</script>

{#if teacher}
	<PageQuery preserveWhileLoading {query} cacheKey={cacheKey} loadingTitle={$t('drawer.tab.documents')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<TeacherDocumentsTab {teacher} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
