<script lang="ts">
	import type { PeriodDefinition } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		activateAcademicYearMutation,
		publishAcademicPeriodMutation,
	} from '$lib/api/mutations/academic.mutations';
	import { deletePeriodDefinitionMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { CalendarRange, ChevronDown, Pencil, Plus, Trash2 } from '$lib/icons';
	import { readAcademicAdminListFilters, writeAcademicAdminListFilters } from '$lib/list/list-url-filters';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import AcademicYearCreateModal from './AcademicYearCreateModal.svelte';
	import PeriodDefinitionFormModal from './PeriodDefinitionFormModal.svelte';

	const initialFilters = $derived(readAcademicAdminListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string; status: string }>(
		{
			getUrl: () => $page.url,
			write: writeAcademicAdminListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readAcademicAdminListFilters($page.url),
	);

	const modals = createUrlSyncedModals({ allowed: ['create', 'period-def'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const periodDefOpen = bindUrlModal(modals, 'period-def');

	let expandedYear = $state<string | null>(academicContext.yearId);
	let periodDefYearId = $state('');
	let editingPeriodDef = $state<PeriodDefinition | null>(null);
	let deletePeriodOpen = $state(false);
	let deletePeriodBusy = $state(false);
	let deletePeriodTarget = $state<PeriodDefinition | null>(null);

	const statusOptions = $derived([
		{ value: 'all', label: $t('academic.filterAllStatuses') },
		{ value: 'published', label: $t('academic.published') },
		{ value: 'draft', label: $t('academic.draft') },
	]);

	const sortedYears = $derived(
		[...academicContext.years].sort((a, b) => b.startDate.localeCompare(a.startDate)),
	);

	const filteredYears = $derived(
		sortedYears.filter((year) => {
			if (listFilters.values.status !== 'all' && year.status !== listFilters.values.status) {
				return false;
			}
			const needle = listFilters.values.q.trim().toLowerCase();
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

	function handleYearCreated(yearId: string) {
		expandedYear = yearId;
	}

	async function handlePublishYear(yearId: string) {
		const ok = await activateAcademicYearMutation(yearId);
		if (!ok) {
			return;
		}
		const year = academicContext.years.find(entry => entry.id === yearId);
		if (year) {
			toast.success(get(t)('academic.toastYearPublished', { label: year.label }));
		}
	}

	async function handlePublishPeriod(periodId: string) {
		const ok = await publishAcademicPeriodMutation(periodId);
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

	function openEditPeriodDef(def: PeriodDefinition) {
		periodDefYearId = def.academicYearId;
		editingPeriodDef = def;
		periodDefOpen.open = true;
	}

	function openDeletePeriodDef(def: PeriodDefinition) {
		deletePeriodTarget = def;
		deletePeriodOpen = true;
	}

	async function confirmDeletePeriodDef() {
		if (!deletePeriodTarget) {
			return;
		}
		deletePeriodBusy = true;
		try {
			const ok = await deletePeriodDefinitionMutation(deletePeriodTarget.id, {
				successMessage: get(t)('periodDefinitions.toastDeleted', { label: deletePeriodTarget.label }),
			});
			if (ok) {
				deletePeriodOpen = false;
				deletePeriodTarget = null;
			}
		}
		finally {
			deletePeriodBusy = false;
		}
	}

	const statusFilterActive = $derived(listFilters.values.status !== 'all' ? 1 : 0);

	$effect(() => {
		listFilters.hydrate(initialFilters);
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.q;
		void listFilters.values.status;
		listFilters.scheduleSync();
	});
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('academic.subtitle')}
		title={$t('academic.title')}
	>
		{#snippet search()}
			<ListSearchField bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet filters()}
			<FilterPanel activeCount={statusFilterActive} title={$t('academic.filterAllStatuses')}>
				<FilterSelect
					bind:value={listFilters.values.status}
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
			{@const open = expandedYear === year.id}
			{@const yearPeriods = periodsFor(year.id)}
			{@const yearPeriodDefs = periodDefinitionsFor(year.id)}
			<section class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
				<button
					type="button"
					class="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-secondary/40"
					onclick={() => (expandedYear = open ? null : year.id)}
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
										: 'bg-secondary text-muted-foreground',
								)}
							>
								{year.status === 'published' ? $t('academic.published') : $t('academic.draft')}
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
									onclick={() => handlePublishYear(year.id)}
								>
									{$t('academic.publishYear')}
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

						<div class="mt-6 flex items-center justify-between gap-3">
							<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
								{$t('periodDefinitions.sectionTitle')}
							</p>
							<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE">
								{#snippet children({ disabled, title })}
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
								{/snippet}
							</PermissionGate>
						</div>
						<ul class="mt-3 space-y-2">
							{#if yearPeriodDefs.length === 0}
								<li class="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
									{$t('periodDefinitions.empty')}
								</li>
							{:else}
								{#each yearPeriodDefs as def (def.id)}
									<li
										class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-3"
									>
										<div>
											<p class="text-sm font-medium">
												{def.label}
												{#if def.isBreak}
													<span class="ml-2 rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
														{$t('periodDefinitions.break')}
													</span>
												{/if}
											</p>
											<p class="font-mono text-[11px] text-muted-foreground">
												{'#'}{def.order} · {def.startTime} → {def.endTime}
											</p>
										</div>
										<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE">
											{#snippet children({ disabled, title })}
												<RowActionMenu>
													{#snippet children()}
														<RowActionMenuItem
															{disabled}
															{title}
															onclick={() => openEditPeriodDef(def)}
														>
															<Pencil class="h-4 w-4" />
															{$t('common.edit')}
														</RowActionMenuItem>
														<RowActionMenuItem
															destructive
															{disabled}
															{title}
															onclick={() => openDeletePeriodDef(def)}
														>
															<Trash2 class="h-4 w-4" />
															{$t('common.delete')}
														</RowActionMenuItem>
													{/snippet}
												</RowActionMenu>
											{/snippet}
										</PermissionGate>
									</li>
								{/each}
							{/if}
						</ul>
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

<ConfirmModal
	bind:open={deletePeriodOpen}
	title={$t('common.deleteConfirmTitle')}
	description={deletePeriodTarget
		? $t('periodDefinitions.deleteConfirm', { label: deletePeriodTarget.label })
		: ''}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deletePeriodBusy}
	onConfirm={confirmDeletePeriodDef}
/>
