<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import ConfigSubjectsView from '$lib/components/school/academics/ConfigSubjectsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { queryConfigSubjectsPage } from '$lib/queries/subjects.queries';

	const selectedId = $derived($page.params.id);
	const query = queryConfigSubjectsPage();

	function selectSubject(subject: Subject) {
		const path = detailHref.configSubject(subject.id);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}

	function selectLevel(group: { label: string }) {
		const path = detailHref.configSubjectLevel(group.label);
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<PageQuery {query} loadingTitle={$t('config.subjects')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('config.subjects')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ConfigSubjectsView
				onSelect={selectSubject}
				{selectedId}
				onSelectLevel={selectLevel}
			/>
		</DataState>
	{/snippet}
</PageQuery>
