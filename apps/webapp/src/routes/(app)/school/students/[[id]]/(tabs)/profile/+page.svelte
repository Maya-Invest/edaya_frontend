<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { getStudentsPageState } from '../../../students-page.svelte';
	import StudentProfileTab from './components/StudentProfileTab.svelte';
	import { getStudentProfileTabState } from './student-profile-tab.svelte';

	const profileTab = getStudentProfileTabState();
	const query = profileTab.query();
	const student = $derived(getStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('drawer.tab.profile')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentProfileTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
