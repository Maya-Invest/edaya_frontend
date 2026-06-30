<script lang="ts">
	import type { StaffRole } from '$lib/types/school';
	import { page } from '$app/stores';
	import RolesMatrixView from '$lib/components/school/configuration/RolesMatrixView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryRolesPage } from '$lib/queries/access.queries';

	const selectedRole = $derived($page.params.role as StaffRole | undefined);
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
			<RolesMatrixView
				onSelect={role => appGoto(`${detailHref.configRole(role)}${$page.url.search}`)}
				{selectedRole}
			/>
		</DataState>
	{/snippet}
</PageQuery>
