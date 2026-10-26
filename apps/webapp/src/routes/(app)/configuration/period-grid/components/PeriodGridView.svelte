<script lang="ts">
	import type { PeriodDefinition, PeriodDefinitionDayOfWeek } from '$lib/types/school';
	import type { PeriodCalendarChanges } from '../lib/period-calendar';
	import type {
		PeriodDefinitionWizardStep,
		PeriodGridModalName,
	} from '../lib/period-grid-modal-surface';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Sparkles } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { PERIOD_DEFINITION_WEEKDAYS } from '../lib/period-definition-presets';
	import {
		PERIOD_DEFINITION_WIZARD_STEPS,
		PERIOD_GRID_MODAL_NAMES,
		PeriodGridWizardObservationGuard,
		allowedPeriodGridModalNames,
		canonicalPeriodGridModalStep,
		isPeriodGridModalTargetValid,
		resolvePeriodDefinitionModalTarget,
	} from '../lib/period-grid-modal-surface';
	import { getPeriodGridPageState } from '../period-grid-page.svelte';
	import PeriodDefinitionCalendar from './PeriodDefinitionCalendar.svelte';
	import PeriodDefinitionFormModal from './PeriodDefinitionFormModal.svelte';
	import PeriodDefinitionWizardModal from './PeriodDefinitionWizardModal.svelte';

	const periodGridPage = getPeriodGridPageState();
	const canConfigureSchoolStructure = $derived(hasPermission('SCHOOL_CONFIGURE'));
	const allowedModalNames = $derived(
		allowedPeriodGridModalNames(canConfigureSchoolStructure),
	);

	const modals = createUrlSyncedModals<PeriodGridModalName>({
		allowed: () => allowedModalNames,
		owned: PERIOD_GRID_MODAL_NAMES,
		allowedSteps: PERIOD_DEFINITION_WIZARD_STEPS,
		getUrl: () => $page.url,
	});
	const wizardObservation = new PeriodGridWizardObservationGuard();
	const periodDefOpen = bindUrlModal(modals, 'period-def');
	const wizardOpen = bindUrlModal(modals, 'period-def-wizard');
	const deleteOpen = bindUrlModal(modals, 'delete-period-def');

	let createDefaults = $state<{ schoolId: string; academicYearId: string; values: PeriodCalendarChanges } | null>(null);

	let deleteBusy = $state(false);

	const sortedYears = $derived(
		[...academicContext.years].sort((a, b) => b.startDate.localeCompare(a.startDate)),
	);
	const modalCatalog = $derived({
		years: sortedYears.map(entry => ({ id: entry.id })),
		periodDefinitions: academicContext.periodDefinitions.map(entry => ({
			id: entry.id,
			academicYearId: entry.academicYearId,
		})),
	});
	const selectedYear = $derived(
		sortedYears.find(year => year.id === periodGridPage.selectedYearId) ?? null,
	);
	const targetedPeriodDefinition = $derived(
		modals.target ? academicContext.periodDefinitionById(modals.target) ?? null : null,
	);
	const periodDefinitionModalTarget = $derived(
		modals.isOpen('period-def')
			? resolvePeriodDefinitionModalTarget(modals.target, modalCatalog)
			: null,
	);
	const editingPeriodDef = $derived(
		periodDefinitionModalTarget?.mode === 'edit' ? targetedPeriodDefinition : null,
	);
	const deleteTarget = $derived(
		modals.isOpen('delete-period-def') ? targetedPeriodDefinition : null,
	);
	const wizardYear = $derived(
		modals.isOpen('period-def-wizard') && modals.target
			? sortedYears.find(year => year.id === modals.target) ?? null
			: null,
	);
	const wizardStep = $derived<PeriodDefinitionWizardStep>(
		canonicalPeriodGridModalStep('period-def-wizard', modals.step, {
			resetAdvancedWizardStep: false,
		}) ?? 'preset',
	);
	const yearOptions = $derived(
		sortedYears.map(year => ({
			value: year.id,
			label: `${year.label} · ${yearStatusLabel(year.status, $t)}`,
		})),
	);
	const periodGroups = $derived(periodDefinitionGroups(selectedYear?.id ?? null));

	afterNavigate(() => {
		modals.hydrate();
		if (!modals.isOpen('period-def'))
			createDefaults = null;
		periodGridPage.hydrateSelectedYear();
		if (!periodGridPage.slice || !academicContext.shellReady) {
			return;
		}
		if (!isPeriodGridModalTargetValid(modals.active, modals.target, modalCatalog)) {
			modals.close();
			return;
		}
		const resetAdvancedWizardStep = wizardObservation.observe(
			modals.isOpen('period-def-wizard'),
		);
		const canonicalStep = canonicalPeriodGridModalStep(modals.active, modals.step, {
			resetAdvancedWizardStep,
		});
		if (canonicalStep !== modals.step) {
			modals.replaceStep(canonicalStep);
		}
	});

	function yearStatusLabel(status: string, translate: (key: string) => string): string {
		if (status === 'published') {
			return translate('academic.published');
		}
		if (status === 'archived') {
			return translate('academic.archived');
		}
		return translate('academic.draft');
	}

	function periodDefinitionGroups(yearId: string | null): Array<{
		dayOfWeek: PeriodDefinitionDayOfWeek;
		defs: PeriodDefinition[];
	}> {
		const defs = yearId ? academicContext.periodDefinitionsForYear(yearId) : [];
		return PERIOD_DEFINITION_WEEKDAYS.map(dayOfWeek => ({
			dayOfWeek,
			defs: defs.filter(def => def.dayOfWeek === dayOfWeek),
		}));
	}

	function openCreatePeriodDef(values: PeriodCalendarChanges | undefined = undefined) {
		if (!selectedYear || !authSession.schoolId) {
			return;
		}
		createDefaults = values ? { schoolId: authSession.schoolId, academicYearId: selectedYear.id, values } : null;
		modals.open('period-def', { target: selectedYear.id });
	}

	function openPeriodDefWizard() {
		if (!selectedYear) {
			return;
		}
		modals.open('period-def-wizard', { target: selectedYear.id, step: 'preset' });
	}

	function openEditPeriodDef(def: PeriodDefinition) {
		modals.open('period-def', { target: def.id });
	}

	function openDeletePeriodDef(def: PeriodDefinition) {
		modals.open('delete-period-def', { target: def.id });
	}

	async function confirmDeletePeriodDef() {
		if (!deleteTarget || deleteBusy) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await periodGridPage.deletePeriodDefinition({
				periodDefinition: deleteTarget,
				successMessage: get(t)('periodDefinitions.toastDeleted', { label: deleteTarget.label }),
			});
			if (ok) {
				modals.close();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('config.periodGrid')}
		title={$t('periodDefinitions.sectionTitle')}
		description={$t('periodDefinitions.subtitle')}
	>
		{#snippet context()}
			{#if yearOptions.length > 0}
				<FilterSelect
					value={periodGridPage.selectedYearId ?? ''}
					options={yearOptions}
					class="h-9 min-w-52 rounded-full text-xs"
					onchange={value => periodGridPage.setSelectedYear(value || null)}
				/>
			{/if}
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="SCHOOL_CONFIGURE">
				{#snippet children({ disabled, title })}
					<div class="flex flex-wrap items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							class="rounded-full"
							disabled={disabled || !selectedYear}
							{title}
							onclick={openPeriodDefWizard}
						>
							<Sparkles class="mr-1 h-4 w-4" />
							{$t('periodDefinitions.quickSetup')}
						</Button>
						<Button
							size="sm"
							class="rounded-full"
							disabled={disabled || !selectedYear}
							{title}
							onclick={() => openCreatePeriodDef()}
						>
							<Plus class="mr-1 h-4 w-4" />
							{$t('periodDefinitions.add')}
						</Button>
					</div>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	{#if !selectedYear}
		<p class="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
			{$t('periodDefinitions.empty')}
		</p>
	{:else}
		{#key `${authSession.schoolId}-${selectedYear.id}`}
			<PeriodDefinitionCalendar groups={periodGroups} onEdit={openEditPeriodDef} onDelete={openDeletePeriodDef} onCreate={openCreatePeriodDef} />
		{/key}
	{/if}
</div>

{#if periodDefOpen.open && periodDefinitionModalTarget}
	<PeriodDefinitionFormModal
		bind:open={periodDefOpen.open}
		academicYearId={periodDefinitionModalTarget.academicYearId}
		periodDefinition={editingPeriodDef}
		initialValues={createDefaults?.schoolId === authSession.schoolId && createDefaults?.academicYearId === periodDefinitionModalTarget.academicYearId ? createDefaults.values : undefined}
	/>
{/if}

{#if wizardOpen.open && wizardYear}
	<PeriodDefinitionWizardModal
		bind:open={wizardOpen.open}
		academicYearId={wizardYear.id}
		step={wizardStep}
		onStepChange={step => modals.setStep(step)}
	/>
{/if}

{#if deleteOpen.open && deleteTarget}
	<ConfirmModal
		bind:open={deleteOpen.open}
		title={$t('common.deleteConfirmTitle')}
		description={$t('periodDefinitions.deleteConfirm', { label: deleteTarget.label })}
		confirmLabel={$t('common.delete')}
		cancelLabel={$t('common.cancel')}
		busy={deleteBusy}
		onConfirm={confirmDeletePeriodDef}
	/>
{/if}
