<script lang="ts">
	import SchoolSettingsView from '$lib/components/school/configuration/SchoolSettingsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { querySchoolSettingsPage } from '$lib/queries/school.queries';

	const query = querySchoolSettingsPage();
</script>

<PageQuery {query} loadingTitle={$t('schoolSettings.title')}>
	{#snippet children(data)}
		<DataState
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('schoolSettings.title')}
			emptyDescription={$t('schoolSettings.emptyDescription')}
		>
			<SchoolSettingsView {data} />
		</DataState>
	{/snippet}
</PageQuery>
