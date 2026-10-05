<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { entityVersions } from '$lib/entity-versions.svelte';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { getStudentsPageState } from '../../../students-page.svelte';
	import { getStudentDocumentsTabState } from './student-documents-tab.svelte';
	import StudentDocumentsTab from './StudentDocumentsTab.svelte';

	const documentsTab = getStudentDocumentsTabState();
	registerVersionInvalidation(documentsTab);
	const query = documentsTab.query();
	const student = $derived(getStudentsPageState().selected);
	const cacheKey = $derived((url: URL) => `${drawerTabRouteCacheKey(url)}:${entityVersions.documents}`);
</script>

{#if student}
	<PageQuery preserveWhileLoading {query} cacheKey={cacheKey} loadingTitle={$t('drawer.tab.documents')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentDocumentsTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
