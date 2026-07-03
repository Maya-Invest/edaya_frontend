<script lang="ts">
	import { page } from '$app/stores';
	import StaffPermissionMatrixView from '$lib/components/school/configuration/StaffPermissionMatrixView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryRolesPage } from '$lib/queries/access.queries';

	const selectedStaffId = $derived($page.params.role);
	const query = queryRolesPage();
</script>

<PageQuery {query} loadingTitle={$t('roles.title')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('roles.title')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<StaffPermissionMatrixView
				onSelect={staffId => appGoto(`${detailHref.configStaffPermissions(staffId)}${$page.url.search}`)}
				{selectedStaffId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
