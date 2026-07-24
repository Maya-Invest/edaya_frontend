<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import { periodsForSelectedYear, persistScopedPeriodId, resolveScopedPeriodId } from '$lib/academic/period-scope';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { FileSpreadsheet, Search, Sparkles } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readClassReportCardListFilters, writeClassReportCardListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { formatGrade } from '$lib/types/report-cards';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { untrack } from 'svelte';
	import { loadReportCardsSlice } from '../lib/report-cards-queries';
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
	const scales = $derived(reportCardsPage.scalesFor(classId));
	const classStudents = $derived(reportCardsPage.studentsFor(classId));
	const periods = $derived(periodsForSelectedYear());

	const listFilters = new ListFiltersState<{ q: string; period: string; status: string }>(
		{
			getUrl: () => $page.url,
			write: writeClassReportCardListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readClassReportCardListFilters($page.url),
	);

	const selectedPeriod = $derived(
		periods.find(entry => entry.id === resolveScopedPeriodId(listFilters.values.period)),
	);

	const statusKeys = ['all', 'none', 'draft', 'generated', 'published'] as const;
	type StatusFilter = (typeof statusKeys)[number];

	const status = $derived(
		statusKeys.includes(listFilters.values.status as StatusFilter)
			? listFilters.values.status as StatusFilter
			: 'all',
	);

	const statusFilterActive = $derived(status !== 'all' ? 1 : 0);

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
		const periodFromUrl = initialFilters.period;
		listFilters.hydrate({
			q: initialFilters.q,
			// Prefer the URL period as-is. Only resolve a default when the URL has none —
			// and untrack so persisting academicContext.periodId cannot re-hydrate the old URL value.
			period: periodFromUrl || untrack(() => resolveScopedPeriodId('')),
			status: statusKeys.includes(initialFilters.status as StatusFilter)
				? initialFilters.status
				: 'all',
		});
	});

	const periodFilterOptions = $derived(
		periods.map(period => ({
			value: period.id,
			label: period.range ? `${period.label} · ${period.range}` : period.label,
		})),
	);

	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: statusLabel(key),
		})),
	);

	function onPeriodChange(periodId: string) {
		listFilters.patchImmediate({ period: periodId });
		persistScopedPeriodId(periodId);
		// Load with the selected id immediately — don't wait for async URL/PageQuery.
		void loadReportCardsSlice(classId, periodId).then((data) => {
			reportCardsPage.applySlice(classId, data);
		});
	}

	function onStatusChange(next: string) {
		listFilters.patchImmediate({ status: next });
	}

	async function generateAll() {
		const count = await reportCardsPage.generateForClass({ classId });
		if (count === null) {
			return;
		}
		if (count > 0) {
			toast.success(get(t)('reportCards.toastGeneratedClass', { n: String(count) }));
			return;
		}
		toast.info(get(t)('reportCards.toastNothingToGenerate'));
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
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={selectedPeriod
			? `${$t('reportCards.classSubtitle')} · ${selectedPeriod.label}`
			: $t('reportCards.classSubtitle')}
		title={$t('reportCards.studentsCount', { n: filteredStudents.length })}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={listFilters.values.q}
					oninput={() => listFilters.scheduleSync()}
					placeholder={$t('common.search')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				value={listFilters.values.period}
				class="h-9 min-w-[12rem] rounded-full text-xs"
				options={periodFilterOptions}
				onchange={onPeriodChange}
			/>
			<FilterPanel activeCount={statusFilterActive} title={$t('reportCards.status')}>
				<FilterSelect
					value={listFilters.values.status}
					class="h-9 w-full rounded-md text-xs"
					options={statusFilterOptions}
					onchange={onStatusChange}
				/>
			</FilterPanel>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="REPORT_CARD_GENERATE"
				mode="disable"
				tooltip={$t('reportCards.generateAll')}
			>
				{#snippet children({ disabled, title })}
					<Button class="rounded-full" {disabled} {title} onclick={generateAll}>
						<Sparkles class="h-4 w-4" />
						{$t('reportCards.generateAll')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<table class="w-full text-sm">
			<thead class="border-b border-border bg-secondary/30 text-left">
				<tr>
					<th class="px-4 py-3 font-medium">{$t('tab.students')}</th>
					<th class="px-4 py-3 font-medium">{$t('reportCards.overall')}</th>
					<th class="px-4 py-3 font-medium">{$t('reportCards.rank')}</th>
					<th class="px-4 py-3 font-medium">{$t('reportCards.status')}</th>
					<th class="px-4 py-3 text-right font-medium">{$t('classGroups.actions')}</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredStudents as student (student.id)}
					{@const result = resultForStudent(student.id)}
					{@const scale = result ? scales.find(entry => entry.id === result.gradeScaleId) : null}
					<tr
						class={cn(
							'border-b border-border/60 last:border-0',
							result && 'cursor-pointer',
							selectedId === result?.id && 'bg-primary/5',
						)}
						onclick={() => {
							if (result) {
								onSelect?.(result);
							}
						}}
					>
						<td class="px-4 py-3 font-medium">
							{student.name}
						</td>
						<td class="px-4 py-3 font-mono">
							{result && scale && result.overallAverage != null
								? formatGrade(result.overallAverage, scale)
								: '—'}
						</td>
						<td class="px-4 py-3 font-mono">
							{result && result.classRank != null && result.classSize != null
								? `${result.classRank}/${result.classSize}`
								: '—'}
						</td>
						<td class="px-4 py-3">
							{#if result}
								<span
									class={cn(
										'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase',
										result.status === 'published'
											? 'bg-accent/15'
											: result.status === 'generated'
											? 'bg-highlight-soft text-highlight'
											: 'bg-secondary text-muted-foreground',
									)}
								>
									{resultStatusLabel(result)}
								</span>
							{:else}
								<span class="text-muted-foreground">—</span>
							{/if}
						</td>
						<td class="px-4 py-3">
							<div
								class="flex justify-end gap-1"
								role="presentation"
								onclick={event => event.stopPropagation()}
							>
								<PermissionGate
									permission="REPORT_CARD_GENERATE"
									mode="disable"
									tooltip={$t('reportCards.generate')}
								>
									{#snippet children({ disabled, title })}
										<Button
											size="sm"
											variant="outline"
											class="rounded-full"
											disabled={disabled || result?.status === 'published'}
											{title}
											onclick={() => generateOne(student.id)}
										>
											<FileSpreadsheet class="h-3.5 w-3.5" />
											{$t('reportCards.generate')}
										</Button>
									{/snippet}
								</PermissionGate>
								<Button
									size="sm"
									class="rounded-full"
									disabled={!result || result.status !== 'generated'}
									onclick={() => {
										if (result) {
											void publishOne(result.id);
										}
									}}
								>
									{$t('reportCards.publish')}
								</Button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-4 py-10 text-center text-sm text-muted-foreground">
							{$t('dataState.emptyDescription')}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
