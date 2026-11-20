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
	import { formatDateInput, formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { ChevronRight, Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { tick, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getAcademicPageState } from '../academic-page.svelte';
	import {
		ACADEMIC_MODAL_NAMES,
		isAcademicModalTargetValid,
		snapshotAcademicMutationTarget,
	} from '../lib/academic-modal-surface';
	import AcademicCalendarForm from './AcademicCalendarForm.svelte';
	import AcademicRecordMenu from './AcademicRecordMenu.svelte';
	import AcademicYearCreateModal from './AcademicYearCreateModal.svelte';

	const academicPage = getAcademicPageState();

	const modals = createUrlSyncedModals<AcademicModalName>({
		allowed: () => ACADEMIC_MODAL_NAMES,
		owned: ACADEMIC_MODAL_NAMES,
		getUrl: () => $page.url,
	});
	// PageQuery may mount this view after navigation has already completed.
	$effect(() => modals.hydrate());
	const createOpen = bindUrlModal(modals, 'create');
	const archiveOpen = bindUrlModal(modals, 'archive-year');
	const publishYearOpen = bindUrlModal(modals, 'publish-year');
	const publishPeriodOpen = bindUrlModal(modals, 'publish-period');
	const editYearOpen = bindUrlModal(modals, 'edit-year');
	const createPeriodOpen = bindUrlModal(modals, 'create-period');
	const editPeriodOpen = bindUrlModal(modals, 'edit-period');
	const deleteYearOpen = bindUrlModal(modals, 'delete-year');
	const deletePeriodOpen = bindUrlModal(modals, 'delete-period');
	let deleteBusy = $state(false);
	const canConfigure = $derived(hasPermission('SCHOOL_CONFIGURE'));
	const canManageLifecycle = $derived(hasPermission('SCHOOL_LIFECYCLE_MANAGE'));

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
			academicYearId: entry.academicYearId,
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
			? academicContext.canonicalPeriods.find(entry => entry.id === modals.target) ?? null
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
	const periodYear = $derived(targetedPeriod ? academicContext.years.find(year => year.id === targetedPeriod.academicYearId) : undefined);
	const targetValid = $derived(isAcademicModalTargetValid(modals.active, modals.target, modalCatalog));
	const deleteTarget = $derived(targetValid ? (modals.active === 'delete-year' ? targetedYear : modals.active === 'delete-period' ? targetedPeriod : null) : null);
	$effect(() => {
		if (!modals.ready || !modals.active || !academicPage.slice || !academicContext.shellReady || archiveBusy || publishYearBusy || publishPeriodBusy || deleteBusy) {
			return;
		}
		const lifecycle = ['archive-year', 'publish-year', 'publish-period'].includes(modals.active);
		if (!targetValid || !(lifecycle ? canManageLifecycle : canConfigure)) {
			untrack(() => modals.close());
		}
	});
	let restoreMenuTarget: string | null = null;
	function openAction(action: AcademicModalName, target: string) {
		restoreMenuTarget = target;
		modals.open(action, { target });
	}
	async function confirmDelete() {
		if (!deleteTarget || deleteBusy || !canConfigure)
			return;
		const id = deleteTarget.id;
		const isYear = modals.active === 'delete-year';
		deleteBusy = true;
		try {
			if (await academicPage.deleteRecord(id, isYear, get(t)('academic.toastDeleted')))
				modals.close();
		}
		finally { deleteBusy = false; }
	}

	afterNavigate(() => {
		modals.hydrate();
		if (!modals.active && restoreMenuTarget) {
			const target = restoreMenuTarget;
			restoreMenuTarget = null;
			void tick().then(() => document.querySelector<HTMLButtonElement>(`[data-academic-menu="${CSS.escape(target)}"] button`)?.focus());
		}
		academicPage.hydrateExpandedYear();
	});

	const statusOptions = $derived([
		{ value: 'all', label: $t('academic.filterAllStatuses') },
		{ value: 'published', label: $t('academic.published') },
		{ value: 'draft', label: $t('academic.draft') },
		{ value: 'archived', label: $t('academic.archived') },
	]);

	function yearStatusLabel(status: string): string {
		if (status === 'published') {
			return $t('academic.published');
		}
		if (status === 'archived') {
			return $t('academic.archived');
		}
		return $t('academic.draft');
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
		if (!publishYearTarget || publishYearBusy || !canManageLifecycle) {
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

	async function confirmArchiveYear() {
		if (!archiveTarget || archiveBusy || !canManageLifecycle) {
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
		if (!publishPeriodTarget || publishPeriodBusy || !canManageLifecycle) {
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
		filterCount={[academicPage.filters.values.status].filter(value => value !== 'all').length}
		onResetFilters={() => academicPage.filters.patchImmediate({ status: 'all' })}
		eyebrow={$t('academic.subtitle')}
		title={$t('academic.title')}
	>
		{#snippet search()}
			<ListSearchField onCommit={() => academicPage.filters.syncNow()} bind:value={academicPage.filters.values.q} oninput={() => academicPage.filters.scheduleSync()} />
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
			{#if canConfigure}<Button size="sm" onclick={() => modals.open('create')}>
				<Plus class="mr-1 h-4 w-4" />
				{$t('academic.createYear')}
			</Button>{/if}
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

	{#if academicPage.refreshFailed}
		<div role="alert" class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
			<p>{$t('mutation.savedRefreshFailed')}</p><Button variant="outline" disabled={academicPage.refreshBusy} onclick={() => academicPage.retryRefresh()}>{$t('dataState.retry')}</Button>
		</div>
	{/if}
	<div class="space-y-3">
		{#each filteredYears as year (year.id)}
			{@const open = academicPage.expandedYear === year.id}
			{@const yearPeriods = periodsFor(year.id)}
			<section class="overflow-hidden rounded-collection border border-border bg-card shadow-soft">
				<div class="flex flex-wrap items-center gap-x-3 px-3">
					<button
						type="button"
						class="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-collection px-2 py-4 text-left transition hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						aria-expanded={open}
						aria-controls={open ? `academic-year-periods-${year.id}` : undefined}
						onclick={() => academicPage.setExpandedYear(open ? null : year.id)}
					>
						<ChevronRight aria-hidden="true" class={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', open && 'rotate-90')} />
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
							<p class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-xs leading-relaxed text-muted-foreground">
								<time class="whitespace-nowrap" datetime={formatDateInput(year.startDate)}>{formatLocaleDate(year.startDate, $locale, { dateStyle: 'medium' })}</time>
								<span>–</span>
								<time class="whitespace-nowrap" datetime={formatDateInput(year.endDate)}>{formatLocaleDate(year.endDate, $locale, { dateStyle: 'medium' })}</time>
							</p>
						</div>
					</button>
					<AcademicRecordMenu id={year.id} label={year.label} catalog={modalCatalog} onAction={openAction} />
				</div>

				{#if open}
					<div id={`academic-year-periods-${year.id}`} class="border-t border-border px-5 py-4">

						<p class="mb-3 font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">
							{$t('academic.periods')}
						</p>
						{#if yearPeriods.length === 0}<p class="mb-3 text-sm text-muted-foreground">{$t('academic.emptyPeriods')}</p>{/if}
						<ul class="space-y-2">
							{#each yearPeriods as period (period.id)}
								<li
									class="flex flex-wrap items-center justify-between gap-3 rounded-collection border border-border/70 bg-background/60 px-4 py-3"
								>
									<div>
										<p class="text-sm font-medium">{period.label}</p>
										<p class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-xs leading-relaxed text-muted-foreground">
											<time class="whitespace-nowrap" datetime={formatDateInput(period.startDate)}>{formatLocaleDate(period.startDate, $locale, { dateStyle: 'medium' })}</time>
											<span>–</span>
											<time class="whitespace-nowrap" datetime={formatDateInput(period.endDate)}>{formatLocaleDate(period.endDate, $locale, { dateStyle: 'medium' })}</time>
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
										<AcademicRecordMenu id={period.id} label={period.label} period catalog={modalCatalog} onAction={openAction} />
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

{#if canConfigure}<AcademicYearCreateModal bind:open={createOpen.open} onCreated={handleYearCreated} />{/if}

{#if canManageLifecycle && archiveOpen.open && archiveTarget}
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

{#if canManageLifecycle && publishYearOpen.open && publishYearTarget}
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

{#if canManageLifecycle && publishPeriodOpen.open && publishPeriodTarget}
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

{#if canConfigure && targetValid}
	{#if editYearOpen.open && targetedYear}
		{#key targetedYear.id}<AcademicCalendarForm bind:open={editYearOpen.open} year={targetedYear} editingYear />{/key}
	{:else if createPeriodOpen.open && targetedYear}
		{#key targetedYear.id}<AcademicCalendarForm bind:open={createPeriodOpen.open} year={targetedYear} />{/key}
	{:else if editPeriodOpen.open && targetedPeriod && periodYear}
		{#key targetedPeriod.id}<AcademicCalendarForm bind:open={editPeriodOpen.open} year={periodYear} period={targetedPeriod} />{/key}
	{/if}
	{#if deleteTarget}
		<ConfirmModal
			bind:open={() => deleteYearOpen.open || deletePeriodOpen.open, (value) => {
 if (!value)
modals.close();
}}
			title={$t(modals.active === 'delete-year' ? 'academic.deleteYear' : 'academic.deletePeriod')}
			description={$t('academic.deleteConfirm', { label: deleteTarget.label })}
			confirmLabel={$t('common.delete')} busy={deleteBusy} onConfirm={confirmDelete}
		/>
	{/if}
{/if}
