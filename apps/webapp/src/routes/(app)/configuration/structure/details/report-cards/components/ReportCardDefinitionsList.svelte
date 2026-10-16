<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { ChevronRight, Plus } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import { reportCardsForScope } from '../lib/report-cards-helpers';
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
		title={$t('reportCards.templates')}
	>
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

	<div class="space-y-2">
		{#each definitions as def (def.id)}
			{@const level = academicContext.gradeLevelById(def.gradeLevelId)}
			{@const scale = reportCardsPage.scales.find(entry => entry.id === def.gradeScaleId)}
			<div class="flex flex-wrap items-center gap-2">
				<a
					href={`${detailHref.configReportCard(def.id)}${detailNavigationSearch($page.url)}`}
					onclick={(event) => {
						if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
							return;
						}
						event.preventDefault();
						onSelect?.(def);
					}}
					class={cn(
						'flex min-w-0 flex-1 items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-soft transition-colors hover:border-primary/40 control-focus',
						selectedId === def.id && 'border-primary/40',
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
			</div>
		{:else}
			<p class="py-10 text-center text-sm text-muted-foreground">
				{$t('dataState.emptyDescription')}
			</p>
		{/each}
	</div>
</div>
