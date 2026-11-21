<script lang="ts">
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { entityVersions } from '$lib/entity-versions.svelte';
	import { t } from '$lib/i18n';
	import { onDestroy } from 'svelte';
	import { getStudentsPageState } from '../../../students-page.svelte';
	import StudentAttendanceTab from './components/StudentAttendanceTab.svelte';
	import { getStudentAttendanceTabState } from './student-attendance-tab.svelte';

	const attendanceTab = getStudentAttendanceTabState();
	onDestroy(() => attendanceTab.cancelMore());
	const query = attendanceTab.query();
	const student = $derived(getStudentsPageState().selected);
</script>

{#if student}
	<PageQuery {query} cache={false} cacheKey={url => `${drawerTabRouteCacheKey(url)}|attendance|${entityVersions.attendance}`} loadingTitle={$t('drawer.tab.attendance')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<StudentAttendanceTab s={student} />
			</DataState>
		{/snippet}
	</PageQuery>
{/if}
