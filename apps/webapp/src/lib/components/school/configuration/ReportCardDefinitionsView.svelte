<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import ReportCardDefinitionFormModal from '$lib/components/school/configuration/ReportCardDefinitionFormModal.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { ChevronRight, Plus, Search } from '$lib/icons';
	import { readReportCardDefinitionListFilters, writeReportCardDefinitionListFilters } from '$lib/list/list-url-filters';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { reportCardsContext } from '$lib/report-cards/context.svelte';
	import { cn } from '$lib/utils';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (d: ReportCardDefinition) => void;
		selectedId?: string;
	} = $props();

	const definitions = $derived(reportCardsContext.definitions);

	const initialFilters = $derived(readReportCardDefinitionListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string; status: string }>(
		{
			getUrl: () => $page.url,
			write: writeReportCardDefinitionListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readReportCardDefinitionListFilters($page.url),
	);

	const statusKeys = ['all', 'draft', 'published'] as const;

	const filteredDefinitions = $derived(
		definitions.filter((def) => {
			const status = listFilters.values.status;
			if (status !== 'all' && def.status !== status)
				return false;
			const needle = listFilters.values.q.trim().toLowerCase();
			if (!needle)
				return true;
			const level = academicContext.gradeLevelById(def.gradeLevelId);
			const scale = reportCardsContext.scales.find(s => s.id === def.gradeScaleId);
			return def.name.toLowerCase().includes(needle)
				|| (level?.name.toLowerCase().includes(needle) ?? false)
				|| (scale?.name.toLowerCase().includes(needle) ?? false);
		}),
	);

	function statusLabel(k: (typeof statusKeys)[number]) {
		if (k === 'all')
			return $t('filter.all');
		return k === 'published' ? $t('academic.published') : $t('academic.draft');
	}

	$effect(() => {
		const next = initialFilters;
		listFilters.hydrate({
			q: next.q,
			status: statusKeys.includes(next.status as (typeof statusKeys)[number])
				? next.status
				: 'all',
		});
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.q;
		void listFilters.values.status;
		listFilters.scheduleSync();
	});

	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: statusLabel(key),
		})),
	);

	let createOpen = $state(false);

	function handleCreated(definitionId: string) {
		appGoto(detailHref.configReportCard(definitionId));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('reportCards.subtitle')}
		title={$t('reportCards.modelsTitle', { n: filteredDefinitions.length })}
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
			<PermissionGate permission="REPORT_CARD_CONFIGURE">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('reportCards.newModel')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<ReportCardDefinitionFormModal bind:open={createOpen} onCreated={handleCreated} />

	<div class="space-y-2">
		{#each filteredDefinitions as def (def.id)}
			{@const level = academicContext.gradeLevelById(def.gradeLevelId)}
			{@const scale = reportCardsContext.scales.find(s => s.id === def.gradeScaleId)}
			<button
				type="button"
				onclick={() => onSelect?.(def)}
				class={cn(
					'flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-soft transition hover:bg-secondary/40',
					selectedId === def.id && 'border-primary/40 bg-primary/5',
				)}
			>
				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<p class="font-display font-semibold">{def.name}</p>
						<span
							class={cn(
								'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase',
								def.status === 'published'
									? 'bg-accent/15 text-accent-foreground'
									: 'bg-secondary text-muted-foreground',
							)}
						>
							{def.status === 'published' ? $t('academic.published') : $t('academic.draft')}
						</span>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">
						{level?.name ?? '—'} · {scale?.name ?? '—'} · {$t('reportCards.sectionCount', { n: def.sections.length })}
					</p>
				</div>
				<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
			</button>
		{:else}
			<p class="py-10 text-center text-sm text-muted-foreground">
				{$t('dataState.emptyDescription')}
			</p>
		{/each}
	</div>
</div>
