<script lang="ts">
	import { page } from '$app/stores';
	import GuardiansView from '$lib/components/school/guardians/GuardiansView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { querySchoolGuardiansPage } from '$lib/queries/people.queries';

	const selectedId = $derived($page.params.id);
	const query = querySchoolGuardiansPage();
</script>

<PageQuery {query} loadingTitle={$t('school.guardians')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('school.guardians')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<GuardiansView
				onSelect={g => appGoto(detailHref.schoolGuardian(g.id))}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
