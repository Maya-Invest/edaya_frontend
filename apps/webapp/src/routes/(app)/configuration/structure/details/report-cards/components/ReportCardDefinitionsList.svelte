<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListEntityCards from '$lib/components/ui/ListEntityCards.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readReportCardDefinitionListFilters, writeReportCardDefinitionListFilters } from '$lib/list/list-url-filters';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import { filterReportCardDefinitions, reportCardsForScope } from '../lib/report-cards-helpers';
	import { getReportCardsPageState } from '../report-cards-page.svelte';
	import ReportCardDefinitionFormModal from './ReportCardDefinitionFormModal.svelte';

	const {
		onSelect,
		selectedId,
		gradeLevelId,
	}: {
		onSelect?: (d: ReportCardDefinition) => void;
		selectedId?: string;
		gradeLevelId: string;
	} = $props();

	const reportCardsPage = getReportCardsPageState();

	const definitions = $derived(
		reportCardsForScope(reportCardsPage.definitions, gradeLevelId, academicContext.yearId),
	);

	const collectionFilters = new ListFiltersState({
		getUrl: () => $page.url,
		write: writeReportCardDefinitionListFilters,
		goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
	}, () => readReportCardDefinitionListFilters($page.url));
	$effect(() => collectionFilters.hydrate(readReportCardDefinitionListFilters($page.url)));
	const matching = $derived(filterReportCardDefinitions(definitions, collectionFilters.values));
	const columns = $derived([
		{ key: 'name', label: $t('common.name'), span: 1, card: { zone: 'header' as const, showLabel: false } },
		{ key: 'summary', label: $t('reportCards.templates'), span: 1, card: { zone: 'body' as const, showLabel: false } },
		{ key: 'status', label: $t('reportCards.publicationStatus'), span: 1, card: { zone: 'footer' as const, showLabel: false } },
	]);

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	function handleCreated(definitionId: string) {
		openDetailDrawer(`${detailHref.configReportCard(definitionId)}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		level="section"
		title={`${$t('reportCards.templates')} (${matching.length})`}
		filterCount={Number(collectionFilters.values.status !== 'all') + Number(collectionFilters.values.defaultModel !== 'all')}
		onResetFilters={() => collectionFilters.patchImmediate({ status: 'all', defaultModel: 'all' })}
	>
		{#snippet search()}
			<ListSearchField value={collectionFilters.values.q} placeholder={$t('common.search')} oninput={event => collectionFilters.patch({ q: event.currentTarget.value })} onCommit={() => collectionFilters.syncNow()} />
		{/snippet}
		{#snippet filters()}
			<label class="flex flex-col gap-2 text-sm">
				<span>{$t('reportCards.publicationStatus')}</span>
				<FilterSelect aria-label={$t('reportCards.publicationStatus')} value={collectionFilters.values.status} options={[
					{ value: 'all', label: $t('filter.all') },
					{ value: 'draft', label: $t('academic.draft') },
					{ value: 'published', label: $t('academic.published') },
				]} onchange={status => collectionFilters.patchImmediate({ status })} />
			</label>
			<label class="flex flex-col gap-2 text-sm">
				<span>{$t('reportCards.defaultModel')}</span>
				<FilterSelect aria-label={$t('reportCards.defaultModel')} value={collectionFilters.values.defaultModel} options={[
					{ value: 'all', label: $t('filter.all') },
					{ value: 'yes', label: $t('reportCards.defaultModel') },
					{ value: 'no', label: $t('reportCards.otherModel') },
				]} onchange={defaultModel => collectionFilters.patchImmediate({ defaultModel })} />
			</label>
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

	</ListPageHeader>

	<ReportCardDefinitionFormModal {gradeLevelId} bind:open={createOpen.open} onCreated={handleCreated} />

	<ListEntityCards {columns} rows={matching} highlightId={selectedId}
		onRowClick={definition => onSelect ? onSelect(definition) : handleCreated(definition.id)}
		emptyLabel={definitions.length ? $t('collection.noMatches') : $t('dataState.emptyDescription')}>
		{#snippet field(def, key)}
			{#if key === 'name'}
				<p class="break-words text-sm font-semibold">{def.name}</p>
			{:else if key === 'summary'}
				{#if def.description}<p class="whitespace-pre-wrap break-words text-sm">{def.description}</p>{/if}
				<p class="text-xs text-muted-foreground">{$t('reportCards.sectionCount', { n: def.sections.length })}</p>
			{:else if key === 'status'}
				<div class="flex flex-wrap gap-2 text-xs">
					<span class={cn('rounded-full px-2 py-1', def.status === 'published' ? 'bg-accent/15 text-accent-foreground' : 'bg-secondary text-muted-foreground')}>
						{def.status === 'published' ? $t('academic.published') : $t('academic.draft')}
					</span>
					<span>{def.isDefault === undefined ? $t('dataState.unavailable') : def.isDefault ? $t('reportCards.defaultModel') : $t('reportCards.otherModel')}</span>
				</div>
			{/if}
		{/snippet}
	</ListEntityCards>
</div>
