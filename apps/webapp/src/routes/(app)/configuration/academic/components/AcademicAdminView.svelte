<script lang="ts">
	import type { AcademicModalName } from '../lib/academic-modal-surface';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import { t } from '$lib/i18n';
	import { CalendarRange, ChevronDown, Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getAcademicPageState } from '../academic-page.svelte';
	import {
		ACADEMIC_MODAL_NAMES,
		isAcademicModalTargetValid,
		snapshotAcademicMutationTarget,
	} from '../lib/academic-modal-surface';
	import AcademicYearCreateModal from './AcademicYearCreateModal.svelte';

	const academicPage = getAcademicPageState();

	const modals = createUrlSyncedModals<AcademicModalName>({
		allowed: () => ACADEMIC_MODAL_NAMES,
		owned: ACADEMIC_MODAL_NAMES,
		getUrl: () => $page.url,
	});
	const createOpen = bindUrlModal(modals, 'create');
	const archiveOpen = bindUrlModal(modals, 'archive-year');
	const publishYearOpen = bindUrlModal(modals, 'publish-year');
	const publishPeriodOpen = bindUrlModal(modals, 'publish-period');

	let archiveBusy = $state(false);
	let publishYearBusy = $state(false);
	let publishPeriodBusy = $state(false);

	const modalCatalog = $derived({
		years: academicContext.years.map(entry => ({
			id: entry.id,
			status: entry.status,
		})),
		periods: academicContext.periods.map(entry => ({
			id: entry.id,
			status: entry.status,
		})),
	});
	const targetedYear = $derived(
		modals.target
			? academicContext.years.find(entry => entry.id === modals.target) ?? null
			: null,
	);
	const targetedPeriod = $derived(
		modals.target
			? academicContext.periods.find(entry => entry.id === modals.target) ?? null
			: null,
	);
	const archiveTarget = $derived.by(() => {
		if (!modals.isOpen('archive-year')) {
			return null;
		}
		return isAcademicModalTargetValid('archive-year', modals.target, modalCatalog)
			? targetedYear
			: null;
	});
	const publishYearTarget = $derived.by(() => {
		if (!modals.isOpen('publish-year')) {
			return null;
		}
		return isAcademicModalTargetValid('publish-year', modals.target, modalCatalog)
			? targetedYear
			: null;
	});
	const publishPeriodTarget = $derived.by(() => {
		if (!modals.isOpen('publish-period')) {
			return null;
		}
		return isAcademicModalTargetValid('publish-period', modals.target, modalCatalog)
			? targetedPeriod
			: null;
	});
	afterNavigate(() => {
		modals.hydrate();
		academicPage.hydrateExpandedYear();
		if (!academicPage.slice || !academicContext.shellReady) {
			return;
		}
		if (!isAcademicModalTargetValid(modals.active, modals.target, modalCatalog)) {
			modals.close();
		}
	});

	const statusOptions = $derived([
		{ value: 'all', label: $t('academic.filterAllStatuses') },
		{ value: 'published', label: $t('academic.published') },
		{ value: 'draft', label: $t('academic.draft') },
		{ value: 'archived', label: $t('academic.archived') },
	]);

	const publishedYearId = $derived(
		academicContext.years.find(year => year.status === 'published')?.id ?? null,
	);

	function yearStatusLabel(status: string): string {
		if (status === 'published') {
			return get(t)('academic.published');
		}
		if (status === 'archived') {
			return get(t)('academic.archived');
		}
		return get(t)('academic.draft');
	}

	const sortedYears = $derived(
		[...academicContext.years].sort((a, b) => b.startDate.localeCompare(a.startDate)),
	);

	const filteredYears = $derived(
		sortedYears.filter((year) => {
			if (academicPage.filters.values.status !== 'all' && year.status !== academicPage.filters.values.status) {
				return false;
			}
			const needle = academicPage.filters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return year.label.toLowerCase().includes(needle)
				|| year.startDate.includes(needle)
				|| year.endDate.includes(needle)
				|| year.status.toLowerCase().includes(needle);
		}),
	);

	function periodsFor(yearId: string) {
		return academicContext.periods
			.filter(p => p.academicYearId === yearId)
			.sort((a, b) => a.startDate.localeCompare(b.startDate));
	}

	function handleYearCreated(yearId: string) {
		academicPage.setExpandedYear(yearId);
	}

	async function confirmPublishYear() {
		if (!publishYearTarget || publishYearBusy) {
			return;
		}
		const target = snapshotAcademicMutationTarget(publishYearTarget);
		publishYearBusy = true;
		try {
			const ok = await academicPage.publishYear(target.id);
			if (!ok) {
				return;
			}
			toast.success(get(t)('academic.toastYearPublished', { label: target.label }));
			modals.close();
		}
		finally {
			publishYearBusy = false;
		}
	}

	function openArchiveYear(yearId: string) {
		modals.open('archive-year', { target: yearId });
	}

	async function confirmArchiveYear() {
		if (!archiveTarget || archiveBusy) {
			return;
		}
		const target = snapshotAcademicMutationTarget(archiveTarget);
		archiveBusy = true;
		try {
			const ok = await academicPage.archiveYear(target.id);
			if (!ok) {
				return;
			}
			toast.success(get(t)('academic.toastYearArchived', { label: target.label }));
			modals.close();
		}
		finally {
			archiveBusy = false;
		}
	}

	async function confirmPublishPeriod() {
		if (!publishPeriodTarget || publishPeriodBusy) {
			return;
		}
		const target = snapshotAcademicMutationTarget(publishPeriodTarget);
		publishPeriodBusy = true;
		try {
			const ok = await academicPage.publishPeriod(target.id);
			if (!ok) {
				return;
			}
			toast.success(get(t)('academic.toastPeriodPublished', { label: target.label }));
			modals.close();
		}
		finally {
			publishPeriodBusy = false;
		}
	}

	const statusFilterActive = $derived(academicPage.filters.values.status !== 'all' ? 1 : 0);
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('academic.subtitle')}
		title={$t('academic.title')}
	>
		{#snippet search()}
			<ListSearchField bind:value={academicPage.filters.values.q} oninput={() => academicPage.filters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
			<FilterPanel activeCount={statusFilterActive} title={$t('academic.filterAllStatuses')}>
				<FilterSelect
					bind:value={academicPage.filters.values.status}
					options={statusOptions}
					class="h-9 w-full rounded-md text-xs"
					onchange={() => academicPage.filters.scheduleSync()}
				/>
			</FilterPanel>
		{/snippet}
		{#snippet primary()}
			<Button size="sm" class="rounded-full" onclick={() => modals.open('create')}>
				<Plus class="mr-1 h-4 w-4" />
				{$t('academic.createYear')}
			</Button>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'academic-years.csv',
					headers: ['label', 'startDate', 'endDate', 'status'],
					loadAll: async () => filteredYears.map(year => [
						year.label,
						year.startDate,
						year.endDate,
						year.status,
					]),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	<div class="space-y-3">
		{#each filteredYears as year (year.id)}
			{@const open = academicPage.expandedYear === year.id}
			{@const yearPeriods = periodsFor(year.id)}
			<section class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
				<button
					type="button"
					class="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-secondary/40"
					onclick={() => academicPage.setExpandedYear(open ? null : year.id)}
				>
					<CalendarRange class="h-4 w-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="font-display font-semibold">{year.label}</h3>
							<span
								class={cn(
									'rounded-full px-2 py-0.5 font-sans tabular-nums text-[10px] uppercase tracking-wide',
									year.status === 'published'
										? 'bg-accent/15 text-accent-foreground'
										: year.status === 'archived'
										? 'bg-muted text-muted-foreground'
										: 'bg-secondary text-muted-foreground',
								)}
							>
								{yearStatusLabel(year.status)}
							</span>
						</div>
						<p class="mt-0.5 font-sans tabular-nums text-xs text-muted-foreground">
							{year.startDate} → {year.endDate}
						</p>
					</div>
					<ChevronDown class={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
				</button>

				{#if open}
					<div class="border-t border-border px-5 py-4">
						{#if year.status !== 'published'}
							<div class="mb-4 flex justify-end">
								<Button
									size="sm"
									class="rounded-full"
									disabled={publishedYearId !== null}
									title={publishedYearId !== null ? $t('academic.publishBlocked') : undefined}
									onclick={() => modals.open('publish-year', { target: year.id })}
								>
									{$t('academic.publishYear')}
								</Button>
							</div>
						{:else if year.status === 'published'}
							<div class="mb-4 flex justify-end">
								<Button
									size="sm"
									variant="outline"
									class="rounded-full"
									onclick={() => openArchiveYear(year.id)}
								>
									{$t('academic.archiveYear')}
								</Button>
							</div>
						{/if}

						<p class="mb-3 font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">
							{$t('academic.periods')}
						</p>
						<ul class="space-y-2">
							{#each yearPeriods as period (period.id)}
								<li
									class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-3"
								>
									<div>
										<p class="text-sm font-medium">{period.label}</p>
										<p class="font-sans tabular-nums text-[11px] text-muted-foreground">
											{period.range} · {period.startDate} → {period.endDate}
										</p>
									</div>
									<div class="flex items-center gap-2">
										<span
											class={cn(
												'rounded-full px-2 py-0.5 font-sans tabular-nums text-[10px] uppercase',
												period.status === 'published'
													? 'bg-accent/15 text-accent-foreground'
													: 'bg-secondary text-muted-foreground',
											)}
										>
											{period.status === 'published'
												? $t('academic.published')
												: $t('academic.draft')}
										</span>
										{#if period.status === 'draft'}
											<Button
												size="sm"
												variant="outline"
												class="rounded-full"
												onclick={() => modals.open('publish-period', { target: period.id })}
											>
												{$t('academic.publishPeriod')}
											</Button>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</section>
		{/each}
	</div>
</div>

<AcademicYearCreateModal bind:open={createOpen.open} onCreated={handleYearCreated} />

{#if archiveOpen.open && archiveTarget}
	<ConfirmModal
		bind:open={archiveOpen.open}
		title={$t('academic.archiveYear')}
		description={$t('academic.archiveYearConfirm', {
			label: archiveTarget.label,
		})}
		confirmLabel={$t('academic.archiveYear')}
		cancelLabel={$t('academic.cancel')}
		busy={archiveBusy}
		onConfirm={confirmArchiveYear}
	/>
{/if}

{#if publishYearOpen.open && publishYearTarget}
	<ConfirmModal
		bind:open={publishYearOpen.open}
		title={$t('academic.publishYear')}
		confirmLabel={$t('academic.publishYear')}
		cancelLabel={$t('academic.cancel')}
		busy={publishYearBusy}
		variant="default"
		onConfirm={confirmPublishYear}
	/>
{/if}

{#if publishPeriodOpen.open && publishPeriodTarget}
	<ConfirmModal
		bind:open={publishPeriodOpen.open}
		title={$t('academic.publishPeriod')}
		confirmLabel={$t('academic.publishPeriod')}
		cancelLabel={$t('academic.cancel')}
		busy={publishPeriodBusy}
		variant="default"
		onConfirm={confirmPublishPeriod}
	/>
{/if}
