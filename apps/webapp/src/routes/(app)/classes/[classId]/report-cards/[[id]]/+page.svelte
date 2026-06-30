<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import ClassReportCardsView from '$lib/components/school/academics/ClassReportCardsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { queryClassReportCardsPage } from '$lib/queries/report-cards.queries';

	const selectedId = $derived($page.params.id);
	const classId = $derived($page.params.classId ?? '6a');
	const query = $derived(queryClassReportCardsPage(classId));

	function selectResult(result: ReportCardResult) {
		const path = detailHref.classReportCard(classId, result.id);
		appGoto(`${path}${$page.url.search}`);
	}
</script>

<PageQuery {query} loadingTitle={$t('reportCards.classTitle')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('reportCards.classTitle')}
			emptyDescription={$t('dataState.emptyDescription')}
		>
			<ClassReportCardsView
				classId={data.classId}
				onSelect={selectResult}
				{selectedId}
			/>
		</DataState>
	{/snippet}
</PageQuery>
