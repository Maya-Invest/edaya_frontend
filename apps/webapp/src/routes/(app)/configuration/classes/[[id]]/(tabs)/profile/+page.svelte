<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { getClassesPageState } from '../../../classes-page.svelte';
	import ClassGroupProfileTab from './components/ClassGroupProfileTab.svelte';

	const state = getClassesPageState();
	const query = state.queryProfile();
	const classGroup = $derived(state.selected);
</script>

{#if classGroup}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} cache={false}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<ClassGroupProfileTab {classGroup} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
