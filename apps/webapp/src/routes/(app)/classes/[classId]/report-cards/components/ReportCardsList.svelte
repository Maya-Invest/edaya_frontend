<script lang="ts">
	import type { ReportListHeader } from '../lib/report-cards-queries';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import ReportCardAvailabilityNotice from '$lib/components/school/report-cards/ReportCardAvailabilityNotice.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';

	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { downloadDocumentLabel } from '$lib/documents/titles';
	import { t } from '$lib/i18n';
	import { Sparkles } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readClassReportCardListFilters, writeClassReportCardListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { formatPersistedGrade, formatReportRank } from '$lib/types/report-cards';
	import { cn } from '$lib/utils';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getReportCardsPageState } from '../report-cards-page.svelte';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (result: ReportListHeader) => void;
		selectedId?: string;
	} = $props();

	const reportCardsPage = getReportCardsPageState();
	const initialFilters = $derived(readClassReportCardListFilters($page.url));
	const list = reportCardsPage.list;
	const rows = $derived(list.current?.items ?? []);
	const period = $derived(academicContext.period);

	const listFilters = new ListFiltersState<{ q: string; status: string }>(
		{
			getUrl: () => $page.url,
			write: writeClassReportCardListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readClassReportCardListFilters($page.url),
	);

	const statusKeys = ['all', 'none', 'draft', 'generated', 'published'] as const;
	type StatusFilter = (typeof statusKeys)[number];

	function statusLabel(key: (typeof statusKeys)[number]) {
		if (key === 'all') {
			return $t('filter.all');
		}
		if (key === 'none') {
			return $t('reportCards.filterNone');
		}
		if (key === 'draft') {
			return $t('reportCards.statusDraft');
		}
		if (key === 'generated') {
			return $t('reportCards.statusGenerated');
		}
		return $t('reportCards.statusPublished');
	}

	function resultStatusLabel(result: ReportListHeader) {
		if (result.status === 'published') {
			return $t('reportCards.statusPublished');
		}
		if (result.status === 'generated') {
			return $t('reportCards.statusGenerated');
		}
		return $t('reportCards.statusDraft');
	}

	$effect(() => {
		const next = initialFilters;
		untrack(() => listFilters.hydrate({
			q: next.q,
			status: statusKeys.includes(next.status as StatusFilter)
				? next.status
				: 'all',
		}));
	});

	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: statusLabel(key),
		})),
	);

	async function generateAll() {
		const count = await reportCardsPage.generateForClass({ classId });
		if (count !== null && count > 0) {
			toast.success(get(t)('reportCards.toastGeneratedClass', { n: String(count) }));
		}
	}

	async function generateOne(studentId: string) {
		const name = reportCardsPage.studentFor(studentId)?.name ?? '';
		await reportCardsPage.generateForStudent({
			studentId,
			successMessage: get(t)('reportCards.toastGenerated', { name }),
		});
	}

	async function publishOne(result: ReportListHeader) {
		const name = reportCardsPage.studentFor(result.studentId)?.name ?? '';
		await reportCardsPage.publishResult({
			resultId: result.id,
			successMessage: get(t)('reportCards.toastPublished', { name }),
		});
	}

	function exportBulletinPack() {
		return reportCardsPage.exportPublished(classId, get(t)('documents.toastRequested')).catch(error => toast.error(String(error)));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		filterCount={[listFilters.values.status].filter(value => value !== 'all').length}
		onResetFilters={() => listFilters.patchImmediate({ status: 'all' })}
		eyebrow="{$t('reportCards.classSubtitle')} · {period?.label ?? '—'}"
		title={$t('reportCards.studentsCount', { n: list.current?.total ?? 0 })}
	>
		{#snippet search()}
			<ListSearchField onCommit={() => listFilters.syncNow()} bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
			<AcademicPeriodSelector />
			<FilterSelect
				value={listFilters.values.status}
				onchange={status => listFilters.patchImmediate({ status })}
				class="h-9 min-w-[10rem] rounded-full text-xs"
				options={statusFilterOptions}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="REPORT_CARD_GENERATE"
				mode="disable"
				tooltip={$t('reportCards.generateAll')}
			>
				{#snippet children({ disabled, title })}
					<Button disabled={disabled || !academicContext.periodId} {title} onclick={generateAll}>
						<Sparkles class="h-4 w-4" />
						{$t('reportCards.generateAll')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly exportLabel={$t('documents.exportBulletinPack')} onExport={() => void exportBulletinPack()} />
		{/snippet}
	</ListPageHeader>

	<ReportCardAvailabilityNotice summary={list.current} />

	<ListEntityTable listKey="ReportCardsList" {rows} total={list.current?.total ?? 0} visibleCount={rows.length}
		hasMore={Boolean(list.current?.nextCursor) && !list.failed} loadingMore={list.loadingMore} onLoadMore={() => list.more()} highlightId={selectedId ? rows.find(student => student.report?.id === selectedId)?.id : undefined} canInspect={student => Boolean(student.report)} onRowClick={(student) => {
			const result = student.report;
			if (result)
				onSelect?.(result);
		}} emptyLabel={$t('dataState.emptyDescription')} columns={[{ key: 'name', label: $t('tab.students'), span: 4, required: true }, { key: 'overall', label: $t('reportCards.overall'), span: 2 }, { key: 'rank', label: $t('reportCards.rank'), span: 2 }, { key: 'status', label: $t('reportCards.status'), span: 2 }, { key: 'actions', label: '', span: 1 }]}>
		{#snippet cell(student, column)}{@const result = student.report}
			{#if column.key === 'name'}{student.name}
			{:else if column.key === 'overall'}<span class="tabular-nums">{formatPersistedGrade(result?.grading, result?.overallAverage)}</span>
			{:else if column.key === 'rank'}<span class="tabular-nums">{formatReportRank(result)}</span>
			{:else if column.key === 'status'}{#if result}<span class={cn('text-xs', result.status === 'published' ? 'text-accent' : result.status === 'generated' ? 'text-highlight' : 'text-muted-foreground')}>{resultStatusLabel(result)}</span>{:else}<span class="text-muted-foreground">—</span>{/if}
			{:else if !result || result.status === 'generated' || result.status === 'published'}<RowActionMenu label={`${$t('list.rowActions')} · ${student.name}`}>
				{#if !result}<RowActionMenuItem onclick={() => generateOne(student.id)}>{$t('reportCards.generate')}</RowActionMenuItem>
				{:else if result.status === 'generated'}<RowActionMenuItem onclick={() => publishOne(result)}>{$t('reportCards.publish')}</RowActionMenuItem>
				{:else if result.status === 'published'}<RowActionMenuItem onclick={() => void reportCardsPage.performRequestDocumentIssuance({ templateKey: 'report-card.v1', sourceId: result.id, studentId: result.studentId, classGroupId: classId, successMessage: get(t)('documents.toastRequested') })}>{downloadDocumentLabel($t, 'report-card.v1')}</RowActionMenuItem>{/if}
			</RowActionMenu>{/if}{/snippet}
	</ListEntityTable>
	{#if list.failed}
		<Button variant="outline" onclick={() => list.failed === 'more' ? list.more() : reportCardsPage.refreshList().catch(() => {})}>{$t('dataState.retry')}</Button>
	{/if}
</div>
