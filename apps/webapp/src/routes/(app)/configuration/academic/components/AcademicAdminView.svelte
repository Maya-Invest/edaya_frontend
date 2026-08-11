<script lang="ts">
	import type { PeriodDefinition, PeriodDefinitionDayOfWeek } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { CalendarRange, ChevronDown, Plus, Sparkles } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getAcademicPageState } from '../academic-page.svelte';
	import { PERIOD_DEFINITION_WEEKDAYS } from '../lib/period-definition-presets';
	import AcademicYearCreateModal from './AcademicYearCreateModal.svelte';
	import PeriodDefinitionBoard from './PeriodDefinitionBoard.svelte';
	import PeriodDefinitionFormModal from './PeriodDefinitionFormModal.svelte';
	import PeriodDefinitionWizardModal from './PeriodDefinitionWizardModal.svelte';

	const academicPage = getAcademicPageState();

	const modals = createUrlSyncedModals({ allowed: ['create', 'period-def'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const periodDefOpen = bindUrlModal(modals, 'period-def');

	let periodDefYearId = $state('');
	let editingPeriodDef = $state<PeriodDefinition | null>(null);
	let wizardOpen = $state(false);
	let wizardYearId = $state('');
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);
	let deleteTarget = $state<PeriodDefinition | null>(null);

	let archiveOpen = $state(false);
	let archiveBusy = $state(false);
	let archiveTargetId = $state('');

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

	function periodDefinitionsFor(yearId: string) {
		return academicContext.periodDefinitionsForYear(yearId);
	}

	function periodDefinitionGroups(yearId: string): Array<{
		dayOfWeek: PeriodDefinitionDayOfWeek;
		defs: PeriodDefinition[];
	}> {
		const defs = periodDefinitionsFor(yearId);
		return PERIOD_DEFINITION_WEEKDAYS.map(dayOfWeek => ({
			dayOfWeek,
			defs: defs.filter(def => def.dayOfWeek === dayOfWeek),
		}));
	}

	function handleYearCreated(yearId: string) {
		academicPage.expandedYear = yearId;
	}

	async function handlePublishYear(yearId: string) {
		const ok = await academicPage.publishYear(yearId);
		if (!ok) {
			return;
		}
		const year = academicContext.years.find(entry => entry.id === yearId);
		if (year) {
			toast.success(get(t)('academic.toastYearPublished', { label: year.label }));
		}
	}

	function openArchiveYear(yearId: string) {
		archiveTargetId = yearId;
		archiveOpen = true;
	}

	async function confirmArchiveYear() {
		if (!archiveTargetId) {
			return;
		}
		archiveBusy = true;
		try {
			const ok = await academicPage.archiveYear(archiveTargetId);
			if (!ok) {
				return;
			}
			const year = academicContext.years.find(entry => entry.id === archiveTargetId);
			if (year) {
				toast.success(get(t)('academic.toastYearArchived', { label: year.label }));
			}
			archiveOpen = false;
			archiveTargetId = '';
		}
		finally {
			archiveBusy = false;
		}
	}

	async function handlePublishPeriod(periodId: string) {
		const ok = await academicPage.publishPeriod(periodId);
		if (!ok) {
			return;
		}
		const period = academicContext.periods.find(entry => entry.id === periodId);
		if (period) {
			toast.success(get(t)('academic.toastPeriodPublished', { label: period.label }));
		}
	}

	function openCreatePeriodDef(yearId: string) {
		periodDefYearId = yearId;
		editingPeriodDef = null;
		periodDefOpen.open = true;
	}

	function openPeriodDefWizard(yearId: string) {
		wizardYearId = yearId;
		wizardOpen = true;
	}

	function openEditPeriodDef(def: PeriodDefinition) {
		periodDefYearId = def.academicYearId;
		editingPeriodDef = def;
		periodDefOpen.open = true;
	}

	function openDeletePeriodDef(def: PeriodDefinition) {
		deleteTarget = def;
		deleteOpen = true;
	}

	async function confirmDeletePeriodDef() {
		if (!deleteTarget) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await academicPage.deletePeriodDefinition({
				periodDefinition: deleteTarget,
				successMessage: get(t)('periodDefinitions.toastDeleted', { label: deleteTarget.label }),
			});
			if (ok) {
				deleteOpen = false;
				deleteTarget = null;
			}
		}
		finally {
			deleteBusy = false;
		}
	}

	const statusFilterActive = $derived(academicPage.filters.values.status !== 'all' ? 1 : 0);

	$effect(() => {
		if (!academicPage.filters.ready) {
			return;
		}
		void academicPage.filters.values.q;
		void academicPage.filters.values.status;
		academicPage.filters.scheduleSync();
	});
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
				/>
			</FilterPanel>
		{/snippet}
		{#snippet primary()}
			<Button size="sm" class="rounded-full" onclick={() => (createOpen.open = true)}>
				<Plus class="mr-1 h-4 w-4" />
				{$t('academic.createYear')}
			</Button>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<div class="space-y-3">
		{#each filteredYears as year (year.id)}
			{@const open = academicPage.expandedYear === year.id}
			{@const yearPeriods = periodsFor(year.id)}
			{@const yearPeriodDefs = periodDefinitionsFor(year.id)}
			<section class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
				<button
					type="button"
					class="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-secondary/40"
					onclick={() => (academicPage.expandedYear = open ? null : year.id)}
				>
					<CalendarRange class="h-4 w-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="font-display font-semibold">{year.label}</h3>
							<span
								class={cn(
									'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
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
						<p class="mt-0.5 font-mono text-xs text-muted-foreground">
							{year.startDate} → {year.endDate}
						</p>
					</div>
					<ChevronDown class={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
				</button>

				{#if open}
					<div class="border-t border-border px-5 py-4">
						{#if year.status === 'draft'}
							<div class="mb-4 flex justify-end">
								<Button
									size="sm"
									class="rounded-full"
									disabled={publishedYearId !== null}
									title={publishedYearId !== null ? $t('academic.publishBlocked') : undefined}
									onclick={() => handlePublishYear(year.id)}
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

						<p class="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
							{$t('academic.periods')}
						</p>
						<ul class="space-y-2">
							{#each yearPeriods as period (period.id)}
								<li
									class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-3"
								>
									<div>
										<p class="text-sm font-medium">{period.label}</p>
										<p class="font-mono text-[11px] text-muted-foreground">
											{period.range} · {period.startDate} → {period.endDate}
										</p>
									</div>
									<div class="flex items-center gap-2">
										<span
											class={cn(
												'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase',
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
												onclick={() => handlePublishPeriod(period.id)}
											>
												{$t('academic.publishPeriod')}
											</Button>
										{/if}
									</div>
								</li>
							{/each}
						</ul>

						<div class="mt-6 flex flex-wrap items-center justify-between gap-3">
							<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
								{$t('periodDefinitions.sectionTitle')}
							</p>
							<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE">
								{#snippet children({ disabled, title })}
									<div class="flex flex-wrap items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											class="rounded-full"
											{disabled}
											{title}
											onclick={() => openPeriodDefWizard(year.id)}
										>
											<Sparkles class="mr-1 h-4 w-4" />
											{$t('periodDefinitions.quickSetup')}
										</Button>
										<Button
											size="sm"
											variant="outline"
											class="rounded-full"
											{disabled}
											{title}
											onclick={() => openCreatePeriodDef(year.id)}
										>
											<Plus class="mr-1 h-4 w-4" />
											{$t('periodDefinitions.add')}
										</Button>
									</div>
								{/snippet}
							</PermissionGate>
						</div>
						{#if yearPeriodDefs.length === 0}
							<ul class="mt-3 space-y-2">
								<li class="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
									{$t('periodDefinitions.empty')}
								</li>
							</ul>
						{:else}
							<PeriodDefinitionBoard
								groups={periodDefinitionGroups(year.id)}
								onEdit={openEditPeriodDef}
								onDelete={openDeletePeriodDef}
							/>
						{/if}
					</div>
				{/if}
			</section>
		{/each}
	</div>
</div>

<AcademicYearCreateModal bind:open={createOpen.open} onCreated={handleYearCreated} />

<PeriodDefinitionFormModal
	bind:open={periodDefOpen.open}
	academicYearId={periodDefYearId}
	periodDefinition={editingPeriodDef}
/>

<PeriodDefinitionWizardModal
	bind:open={wizardOpen}
	academicYearId={wizardYearId}
/>

<ConfirmModal
	bind:open={archiveOpen}
	title={$t('academic.archiveYear')}
	description={archiveTargetId
		? $t('academic.archiveYearConfirm', {
			label: academicContext.years.find(entry => entry.id === archiveTargetId)?.label ?? '',
		})
		: ''}
	confirmLabel={$t('academic.archiveYear')}
	cancelLabel={$t('academic.cancel')}
	busy={archiveBusy}
	onConfirm={confirmArchiveYear}
/>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={deleteTarget
		? $t('periodDefinitions.deleteConfirm', { label: deleteTarget.label })
		: ''}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDeletePeriodDef}
/>
