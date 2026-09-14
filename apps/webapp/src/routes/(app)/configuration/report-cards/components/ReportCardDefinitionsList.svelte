<script lang="ts">
	import type { GradeScale, ReportCardDefinition } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { ChevronRight, Plus } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import { getReportCardsPageState } from '../report-cards-page.svelte';
	import ReportCardDefinitionFormModal from './ReportCardDefinitionFormModal.svelte';

	const {
		onSelect,
		selectedId,
		loadedScales,
		loadedDefinitions,
	}: {
		onSelect?: (d: ReportCardDefinition) => void;
		selectedId?: string;
		loadedScales?: GradeScale[];
		loadedDefinitions?: ReportCardDefinition[];
	} = $props();

	const reportCardsPage = getReportCardsPageState();

	$effect(() => {
		if (!loadedScales || !loadedDefinitions || reportCardsPage.slice) {
			return;
		}
		reportCardsPage.applySlice({
			scales: loadedScales,
			definitions: loadedDefinitions,
		});
	});
	const statusKeys = ['all', 'draft', 'published'] as const;

	const filteredDefinitions = $derived(
		reportCardsPage.definitions.filter((def) => {
			const status = reportCardsPage.filters.values.status;
			if (status !== 'all' && def.status !== status) {
				return false;
			}
			const needle = reportCardsPage.filters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			const level = academicContext.gradeLevelById(def.gradeLevelId);
			const scale = reportCardsPage.scales.find(entry => entry.id === def.gradeScaleId);
			return def.name.toLowerCase().includes(needle)
				|| (level?.name.toLowerCase().includes(needle) ?? false)
				|| (scale?.name.toLowerCase().includes(needle) ?? false);
		}),
	);

	function statusLabel(k: (typeof statusKeys)[number]) {
		if (k === 'all') {
			return $t('filter.all');
		}
		return k === 'published' ? $t('academic.published') : $t('academic.draft');
	}

	$effect(() => {
		if (!reportCardsPage.filters.ready) {
			return;
		}
		void reportCardsPage.filters.values.q;
		void reportCardsPage.filters.values.status;
		reportCardsPage.filters.scheduleSync();
	});

	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: statusLabel(key),
		})),
	);

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

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
			<ListSearchField
				bind:value={reportCardsPage.filters.values.q}
				oninput={() => reportCardsPage.filters.scheduleSync()}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				bind:value={reportCardsPage.filters.values.status}
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
						onclick={() => modals.open('create')}
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

	<ReportCardDefinitionFormModal bind:open={createOpen.open} onCreated={handleCreated} />

	<div class="space-y-2">
		{#each filteredDefinitions as def (def.id)}
			{@const level = academicContext.gradeLevelById(def.gradeLevelId)}
			{@const scale = reportCardsPage.scales.find(entry => entry.id === def.gradeScaleId)}
			<a
				href={detailHref.configReportCard(def.id)}
				onclick={(event) => {
					if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
						return;
					}
					event.preventDefault();
					onSelect?.(def);
				}}
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
								'rounded-full px-2 py-0.5 font-sans tabular-nums text-[10px] uppercase',
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
			</a>
		{:else}
			<p class="py-10 text-center text-sm text-muted-foreground">
				{$t('dataState.emptyDescription')}
			</p>
		{/each}
	</div>
</div>
