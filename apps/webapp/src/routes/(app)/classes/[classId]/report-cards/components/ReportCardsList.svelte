<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
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
	import { get } from 'svelte/store';
	import { getReportCardsPageState } from '../report-cards-page.svelte';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (result: ReportCardResult) => void;
		selectedId?: string;
	} = $props();

	const reportCardsPage = getReportCardsPageState();
	const initialFilters = $derived(readClassReportCardListFilters($page.url));
	const results = $derived(reportCardsPage.resultsFor(classId));
	const classStudents = $derived(reportCardsPage.studentsFor(classId));
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

	const status = $derived(
		statusKeys.includes(listFilters.values.status as StatusFilter)
			? listFilters.values.status as StatusFilter
			: 'all',
	);

	const filteredStudents = $derived(
		classStudents.filter((student) => {
			const needle = listFilters.values.q.trim().toLowerCase();
			if (needle && !student.name.toLowerCase().includes(needle)) {
				return false;
			}
			const result = results.find(entry => entry.studentId === student.id);
			if (status === 'none') {
				return !result;
			}
			if (status === 'all') {
				return true;
			}
			return result?.status === status;
		}),
	);

	function resultForStudent(studentId: string) {
		return results.find(entry => entry.studentId === studentId);
	}

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

	function resultStatusLabel(result: ReportCardResult) {
		if (result.status === 'published') {
			return $t('reportCards.statusPublished');
		}
		if (result.status === 'generated') {
			return $t('reportCards.statusGenerated');
		}
		return $t('reportCards.statusDraft');
	}

	$effect(() => {
		listFilters.hydrate({
			q: initialFilters.q,
			status: statusKeys.includes(initialFilters.status as StatusFilter)
				? initialFilters.status
				: 'all',
		});
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.status;
		listFilters.scheduleSync();
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

	async function publishOne(resultId: string) {
		const result = results.find(entry => entry.id === resultId);
		if (!result) {
			return;
		}
		const name = reportCardsPage.studentFor(result.studentId)?.name ?? '';
		await reportCardsPage.publishResult({
			resultId,
			successMessage: get(t)('reportCards.toastPublished', { name }),
		});
	}

	async function exportBulletinPack() {
		const published = results.filter(entry => entry.status === 'published');
		if (published.length === 0) {
			return;
		}
		await reportCardsPage.performRequestDocumentIssuanceBatch({
			templateKey: 'report-card.v1',
			items: published.map(entry => ({
				sourceId: entry.id,
				requestId: crypto.randomUUID(),
				studentId: entry.studentId,
				classGroupId: classId,
			})),
			successMessage: get(t)('documents.toastRequested'),
		});
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		filterCount={[listFilters.values.status].filter(value => value !== 'all').length}
		onResetFilters={() => listFilters.patchImmediate({ status: 'all' })}
		eyebrow="{$t('reportCards.classSubtitle')} · {period?.label ?? '—'}"
		title={$t('reportCards.studentsCount', { n: filteredStudents.length })}
	>
		{#snippet search()}
			<ListSearchField onCommit={() => listFilters.syncNow()} bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
			<AcademicPeriodSelector />
			<FilterSelect
				bind:value={listFilters.values.status}
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

	<ReportCardAvailabilityNotice results={results.filter(result => filteredStudents.some(student => student.id === result.studentId))} />

	<ListEntityTable listKey="ReportCardsList" rows={filteredStudents} highlightId={selectedId ? filteredStudents.find(student => resultForStudent(student.id)?.id === selectedId)?.id : undefined} canInspect={student => Boolean(resultForStudent(student.id))} onRowClick={(student) => {
		const result = resultForStudent(student.id);
		if (result)
			onSelect?.(result);
	}} emptyLabel={$t('dataState.emptyDescription')} columns={[{ key: 'name', label: $t('tab.students'), span: 4, required: true }, { key: 'overall', label: $t('reportCards.overall'), span: 2 }, { key: 'rank', label: $t('reportCards.rank'), span: 2 }, { key: 'status', label: $t('reportCards.status'), span: 2 }, { key: 'actions', label: '', span: 1 }]}>
		{#snippet cell(student, column)}{@const result = resultForStudent(student.id)}
			{#if column.key === 'name'}{student.name}
			{:else if column.key === 'overall'}<span class="tabular-nums">{formatPersistedGrade(result?.grading, result?.overallAverage)}</span>
			{:else if column.key === 'rank'}<span class="tabular-nums">{formatReportRank(result)}</span>
			{:else if column.key === 'status'}{#if result}<span class={cn('text-xs', result.status === 'published' ? 'text-accent' : result.status === 'generated' ? 'text-highlight' : 'text-muted-foreground')}>{resultStatusLabel(result)}</span>{:else}<span class="text-muted-foreground">—</span>{/if}
			{:else if !result || result.status === 'generated' || result.status === 'published'}<RowActionMenu label={`${$t('list.rowActions')} · ${student.name}`}>
				{#if !result}<RowActionMenuItem onclick={() => generateOne(student.id)}>{$t('reportCards.generate')}</RowActionMenuItem>
				{:else if result.status === 'generated'}<RowActionMenuItem onclick={() => publishOne(result.id)}>{$t('reportCards.publish')}</RowActionMenuItem>
				{:else if result.status === 'published'}<RowActionMenuItem onclick={() => void reportCardsPage.performRequestDocumentIssuance({ templateKey: 'report-card.v1', sourceId: result.id, studentId: result.studentId, classGroupId: classId, successMessage: get(t)('documents.toastRequested') })}>{downloadDocumentLabel($t, 'report-card.v1')}</RowActionMenuItem>{/if}
			</RowActionMenu>{/if}{/snippet}
	</ListEntityTable>
</div>
