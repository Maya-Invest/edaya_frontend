<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		generateReportCardResultMutation,
		generateReportCardsForClassMutation,
		publishReportCardResultMutation,
	} from '$lib/api/mutations/report-cards.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { FileSpreadsheet, Search, Sparkles } from '$lib/icons';
	import { readClassReportCardListFilters, writeClassReportCardListFilters } from '$lib/list/list-url-filters';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { reportCardsContext } from '$lib/report-cards/context.svelte';
	import { toast } from '$lib/toast.svelte';
	import { formatGrade } from '$lib/types/report-cards';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (r: ReportCardResult) => void;
		selectedId?: string;
	} = $props();

	const initialFilters = $derived(readClassReportCardListFilters($page.url));

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

	const results = $derived(reportCardsContext.resultsForClass(classId));
	const period = $derived(academicContext.period);
	const classStudents = $derived(detailDataContext.studentsForClass(classId));

	const filteredStudents = $derived(
		classStudents.filter((student) => {
			const needle = listFilters.values.q.trim().toLowerCase();
			if (needle && !student.name.toLowerCase().includes(needle))
				return false;
			const result = results.find(r => r.studentId === student.id);
			if (status === 'none')
				return !result;
			if (status === 'all')
				return true;
			return result?.status === status;
		}),
	);

	function resultForStudent(studentId: string) {
		return results.find(r => r.studentId === studentId);
	}

	function statusLabel(k: (typeof statusKeys)[number]) {
		if (k === 'all')
			return $t('filter.all');
		if (k === 'none')
			return $t('reportCards.filterNone');
		if (k === 'draft')
			return $t('reportCards.statusDraft');
		if (k === 'generated')
			return $t('reportCards.statusGenerated');
		return $t('reportCards.statusPublished');
	}

	function resultStatusLabel(result: ReportCardResult) {
		if (result.status === 'published')
			return $t('reportCards.statusPublished');
		if (result.status === 'generated')
			return $t('reportCards.statusGenerated');
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
		const n = await generateReportCardsForClassMutation(classId);
		if (n === null) {
			return;
		}
		toast.success(get(t)('reportCards.toastGeneratedClass', { n: String(n) }));
	}

	async function generateOne(studentId: string) {
		const ok = await generateReportCardResultMutation(studentId);
		if (ok) {
			const name = detailDataContext.students.find(s => s.id === studentId)?.name ?? '';
			toast.success(get(t)('reportCards.toastGenerated', { name }));
		}
	}

	async function publishOne(resultId: string) {
		const result = reportCardsContext.results.find(entry => entry.id === resultId);
		if (!result) {
			return;
		}
		const ok = await publishReportCardResultMutation(
			result.id,
			result.studentId,
			result.academicPeriodId,
			result.definitionId,
		);
		if (ok) {
			const name = detailDataContext.students.find(s => s.id === result.studentId)?.name ?? '';
			toast.success(get(t)('reportCards.toastPublished', { name }));
		}
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow="{$t('reportCards.classSubtitle')} · {period?.label ?? '—'}"
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
					{@const scale = result ? reportCardsContext.scales.find(s => s.id === result.gradeScaleId) : null}
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
						<td class="px-4 py-3 font-mono">
							{result && scale ? formatGrade(result.overallAverage, scale) : '—'}
						</td>
						<td class="px-4 py-3 font-mono">
							{result ? `${result.classRank}/${result.classSize}` : '—'}
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
