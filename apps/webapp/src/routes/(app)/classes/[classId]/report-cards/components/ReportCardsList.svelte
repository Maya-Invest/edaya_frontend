<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { requestDocumentIssuanceBatchMutation, requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { downloadDocumentLabel } from '$lib/documents/titles';
	import { t } from '$lib/i18n';
	import { FileSpreadsheet, Sparkles } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readClassReportCardListFilters, writeClassReportCardListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { formatGrade } from '$lib/types/report-cards';
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
	const scales = $derived(reportCardsPage.scalesFor(classId));
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
		await requestDocumentIssuanceBatchMutation({
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
		eyebrow="{$t('reportCards.classSubtitle')} · {period?.label ?? '—'}"
		title={$t('reportCards.studentsCount', { n: filteredStudents.length })}
	>
		{#snippet search()}
			<ListSearchField bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
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
					<Button class="rounded-full" {disabled} {title} onclick={generateAll}>
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
							selectedId === result?.id && 'bg-primary/5',
						)}
					>
						<td class="px-4 py-3">
							<button
								type="button"
								class="text-left font-medium hover:text-primary"
								onclick={() => result && onSelect?.(result)}
							>
								{student.name}
							</button>
						</td>
						<td class="px-4 py-3 font-sans tabular-nums">
							{result && scale ? formatGrade(result.overallAverage, scale) : '—'}
						</td>
						<td class="px-4 py-3 font-sans tabular-nums">
							{result ? `${result.classRank}/${result.classSize}` : '—'}
						</td>
						<td class="px-4 py-3">
							{#if result}
								<span
									class={cn(
										'rounded-full px-2 py-0.5 font-sans tabular-nums text-[10px] uppercase',
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
							<div class="flex justify-end gap-1">
								{#if !result}
									<Button size="sm" variant="outline" class="rounded-full" onclick={() => generateOne(student.id)}>
										<FileSpreadsheet class="h-3.5 w-3.5" />
										{$t('reportCards.generate')}
									</Button>
								{:else if result.status === 'generated'}
									<Button size="sm" class="rounded-full" onclick={() => publishOne(result.id)}>
										{$t('reportCards.publish')}
									</Button>
								{/if}
								{#if result?.status === 'published'}
									<Button
										size="sm"
										variant="outline"
										class="rounded-full"
										onclick={() => void requestDocumentIssuanceMutation({
											templateKey: 'report-card.v1',
											sourceId: result.id,
											studentId: result.studentId,
											classGroupId: classId,
											successMessage: get(t)('documents.toastRequested'),
										})}
									>
										{downloadDocumentLabel($t, 'report-card.v1')}
									</Button>
								{/if}
								{#if result}
									<Button size="sm" variant="ghost" class="rounded-full" onclick={() => onSelect?.(result)}>
										{$t('reportCards.view')}
									</Button>
								{/if}
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
