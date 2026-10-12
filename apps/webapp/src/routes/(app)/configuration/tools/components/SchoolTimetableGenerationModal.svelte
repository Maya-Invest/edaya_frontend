<script lang="ts">
	import type { GenerateSchoolResult } from '$lib/api/mutations/timetable-generation.mutations';

	import type { SchoolRaw } from '$lib/api/school-data';
	import type { TimetableGenerationError } from '../lib/timetable-generation-errors';
	import type { TimetableGenerationStep } from '../lib/tools-workflow';
	import type { TimetableGenerationOptions, TimetablePlanningPageState } from '../timetable-planning-page.svelte';
	import type { TimetableSetupTab } from './TimetableGenerationSetupTabs.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { formatDateInput, parseCivilDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { untrack } from 'svelte';
	import { buildTimetableRangePresets, timetableGenerationModalContentClass, TIMETABLE_GENERATION_MODAL_SETUP_BODY_CLASS, TIMETABLE_GENERATION_MODAL_SETUP_LAYOUT_CLASS, TIMETABLE_GENERATION_MODAL_TAB_PANEL_CLASS } from '../lib/timetable-generation-ui';
	import { activeTimetableClassId, sortTimetableClasses } from '../timetable-planning';
	import { getToolsPageState } from '../tools-page.svelte';
	import TimetableGenerationErrorPanel from './TimetableGenerationErrorPanel.svelte';
	import TimetableGenerationResultPanel from './TimetableGenerationResultPanel.svelte';
	import TimetableGenerationSetupTabs from './TimetableGenerationSetupTabs.svelte';
	import TimetablePreferredPeriodsPanel from './TimetablePreferredPeriodsPanel.svelte';
	import TimetableRangeSelector from './TimetableRangeSelector.svelte';
	import TimetableSolverOptionsPanel from './TimetableSolverOptionsPanel.svelte';
	import TimetableWorkloadConfigPanel from './TimetableWorkloadConfigPanel.svelte';

	const actionState = getToolsPageState();

	let {
		open = $bindable(false),
		state: planningPage,
		phase,
		setupTab,
		onPhaseChange,
		onSetupTabChange,
		onInvalidPhase,
	}: {
		open?: boolean;
		state: TimetablePlanningPageState;
		phase: TimetableGenerationStep;
		setupTab: TimetableSetupTab;
		onPhaseChange: (phase: TimetableGenerationStep) => void;
		onSetupTabChange: (tab: TimetableSetupTab) => void;
		onInvalidPhase: (phase: TimetableGenerationStep) => void;
	} = $props();

	let generating = $state(false);
	let startDate = $state('');
	let endDate = $state('');
	let selectedClassId = $state('');
	let selectedClassGroupIds = $state<string[]>([]);
	let enforceWorkloadFulfillment = $state<boolean | undefined>();
	let generationMode = $state<'weekly' | 'free'>('weekly');
	let excludeBreakSlots = $state<boolean | undefined>();
	let allowUnassignedTeacherPlacements = $state<boolean | undefined>();
	let useHomeroomTeacherFallback = $state<boolean | undefined>();
	let minDayGapSameSubject = $state('');
	let timetableMinPeriodSpan = $state('');
	let timetableMaxPeriodSpan = $state('');
	let schoolRaw = $state<SchoolRaw | null>(null);
	let preferredIds = $state<string[]>([]);
	let overrides = $state<Record<string, number>>({});
	let minSpanOverrides = $state<Record<string, number>>({});
	let maxSpanOverrides = $state<Record<string, number>>({});
	let schoolResult = $state<GenerateSchoolResult | null>(null);
	let generationError = $state<TimetableGenerationError | null>(null);
	let formScope = $state('');

	const periods = $derived(academicContext.periodDefinitionsForYear(academicContext.yearId));
	const yearStart = $derived(formatDateInput(academicContext.year?.startDate));
	const yearEnd = $derived(formatDateInput(academicContext.year?.endDate));
	const rangePresets = $derived(buildTimetableRangePresets({
		periods: academicContext.periodsForYear,
		yearStart,
		yearEnd,
	}));
	const validRange = $derived(Boolean(startDate && endDate && startDate <= endDate
		&& (!yearStart || startDate >= yearStart)
		&& (!yearEnd || endDate <= yearEnd)));
	const selectedClasses = $derived(planningPage.classes.filter(row => selectedClassGroupIds.includes(row.id)));
	const orderedClasses = $derived(sortTimetableClasses(planningPage.classes, academicContext.gradeLevels));
	const selectedClassSubjects = $derived(planningPage.classSubjects.filter(row => selectedClassGroupIds.includes(row.classGroupId)));
	const classLabels = $derived(Object.fromEntries(planningPage.classes.map(row => [row.id, row.name])));
	const rangeLabel = $derived(startDate && endDate
		? `${new Intl.DateTimeFormat($locale, { dateStyle: 'medium' }).format(parseCivilDate(startDate))} – ${new Intl.DateTimeFormat($locale, { dateStyle: 'medium' }).format(parseCivilDate(endDate))}`
		: '');
	const viewPhase = $derived(generating && phase === 'setup' ? 'generating' as const : phase);
	const modalTitle = $derived(
		viewPhase === 'error'
			? $t('timetable.schoolGenerateErrorTitle')
			: viewPhase === 'success'
			? $t('timetable.schoolGenerateResultTitle')
			: $t('timetable.schoolGenerateTitle'),
	);
	const modalDescription = $derived(
		viewPhase === 'error'
			? $t('timetable.errorReviewHint')
			: viewPhase === 'success'
			? $t('timetable.resultReviewHint')
			: viewPhase === 'generating'
			? ''
			: $t('timetable.schoolGenerateHint'),
	);

	function initializeForm() {
		formScope = `${academicContext.schools[0]?.id ?? ''}:${academicContext.yearId}`;
		generating = false;
		({ startDate, endDate } = planningPage.range);
		selectedClassId = orderedClasses[0]?.id ?? '';
		selectedClassGroupIds = planningPage.classes.map(row => row.id);
		overrides = {};
		minSpanOverrides = {};
		maxSpanOverrides = {};
		schoolResult = null;
		generationError = null;
		const school = academicContext.schools[0];
		enforceWorkloadFulfillment = school?.timetableEnforceWorkloadFulfillment;
		generationMode = school?.timetableGenerationMode ?? 'weekly';
		excludeBreakSlots = school?.timetableExcludeBreakSlots;
		allowUnassignedTeacherPlacements = school?.timetableAllowUnassignedTeacherPlacements;
		useHomeroomTeacherFallback = school?.timetableUseHomeroomTeacherFallback;
		minDayGapSameSubject = school ? String(school.timetableMinDayGapSameSubject) : '';
		timetableMinPeriodSpan = school ? String(school.timetableMinPeriodSpan) : '1';
		timetableMaxPeriodSpan = school ? String(school.timetableMaxPeriodSpan) : '1';
		preferredIds = [...(school?.timetablePreferredPeriodDefinitionIds ?? [])];
		schoolRaw = null;
		if (school) {
			void actionState.loadSchoolForForm(school.id).then((raw) => {
				schoolRaw = raw;
			});
		}
	}

	$effect(() => {
		const isOpen = open;
		// Reset drafts when academic scope changes while the form is open.
		const scope = `${academicContext.schools[0]?.id ?? ''}:${academicContext.yearId}`;
		untrack(() => {
			const changedScope = isOpen && formScope && scope !== formScope;
			handleModalOpenChange(isOpen);
			if (changedScope)
				onPhaseChange('setup');
		});
	});

	$effect(() => {
		const nextId = activeTimetableClassId(orderedClasses, selectedClassGroupIds, selectedClassId);
		if (nextId !== selectedClassId)
			selectedClassId = nextId;
	});

	function handleModalOpenChange(isOpen: boolean) {
		if (isOpen) {
			initializeForm();
			return;
		}
		schoolResult = null;
		generationError = null;
		generating = false;
	}

	function buildOptions(): TimetableGenerationOptions | undefined {
		const value: TimetableGenerationOptions = { generationMode };
		if (enforceWorkloadFulfillment !== undefined) {
			value.enforceWorkloadFulfillment = enforceWorkloadFulfillment;
		}
		if (excludeBreakSlots !== undefined) {
			value.excludeBreakSlots = excludeBreakSlots;
		}
		if (allowUnassignedTeacherPlacements !== undefined) {
			value.allowUnassignedTeacherPlacements = allowUnassignedTeacherPlacements;
		}
		if (useHomeroomTeacherFallback !== undefined) {
			value.useHomeroomTeacherFallback = useHomeroomTeacherFallback;
		}
		if (minDayGapSameSubject) {
			value.minDayGapSameSubject = Number(minDayGapSameSubject);
		}
		return value;
	}

	function includedOverrides(values: Record<string, number>): Record<string, number> {
		const subjectIds = new Set(selectedClassSubjects.map(subject => subject.id));
		return Object.fromEntries(Object.entries(values).filter(([id]) => subjectIds.has(id)));
	}

	async function submit() {
		if (!validRange || !selectedClasses.length || generating || planningPage.busy) {
			return;
		}
		generating = true;
		const runScope = formScope;
		try {
			const outcome = await planningPage.generate({
				classGroupIds: [...selectedClassGroupIds],
				startDate,
				endDate,
				options: buildOptions(),
				periodsPerWeekByClassSubjectId: includedOverrides(overrides),
				minPeriodSpanByClassSubjectId: includedOverrides(minSpanOverrides),
				maxPeriodSpanByClassSubjectId: includedOverrides(maxSpanOverrides),
			});
			if (formScope !== runScope)
				return;
			if (outcome.ok) {
				schoolResult = outcome.value;
				onPhaseChange('success');
			}
			else {
				generationError = outcome.error;
				onPhaseChange('error');
			}
		}
		finally {
			if (formScope === runScope)
				generating = false;
		}
	}

	function runAgain() {
		schoolResult = null;
		generationError = null;
		generating = false;
		onPhaseChange('setup');
	}

	$effect(() => {
		if (!open) {
			return;
		}
		if (phase === 'success' && !schoolResult) {
			onInvalidPhase('setup');
		}
		else if (phase === 'error' && !generationError) {
			onInvalidPhase('setup');
		}
	});
</script>

<FormModal
	bind:open
	title={modalTitle}
	description={modalDescription}
	contentClass={timetableGenerationModalContentClass(viewPhase)}
	bodyClass={viewPhase === 'setup' ? TIMETABLE_GENERATION_MODAL_SETUP_BODY_CLASS : undefined}
	busy={planningPage.busy}
	submitDisabled={!validRange || !selectedClasses.length || !planningPage.canGenerateSchoolInitial}
	onSubmit={submit}
>
	{#if viewPhase === 'error' && generationError}
		<TimetableGenerationErrorPanel
			error={generationError}
			{rangeLabel}
		/>
	{:else if viewPhase === 'success' && schoolResult}
		<TimetableGenerationResultPanel mode="school" {schoolResult} {classLabels} {rangeLabel} />
	{:else if viewPhase === 'generating'}
		<div class="space-y-4 py-2">
			<p class="text-sm text-muted-foreground">{$t('timetable.schoolGenerateHint')}</p>
		</div>
	{:else}
		<div class={TIMETABLE_GENERATION_MODAL_SETUP_LAYOUT_CLASS}>
			<div class="shrink-0 space-y-4">
				<TimetableRangeSelector
					bind:startDate
					bind:endDate
					bind:generationMode
					showGenerationMode
					presets={rangePresets}
					{validRange}
				/>

				<TimetableGenerationSetupTabs
					bind:activeTab={() => setupTab, onSetupTabChange}
				/>
			</div>

			<div class={TIMETABLE_GENERATION_MODAL_TAB_PANEL_CLASS}>
				{#if setupTab === 'subjects'}
					<TimetableWorkloadConfigPanel
						classes={planningPage.classes}
						gradeLevels={academicContext.gradeLevels}
						bind:includedClassIds={selectedClassGroupIds}
						classSubjects={selectedClassSubjects}
						subjectLabels={planningPage.subjectLabels}
						teacherLabelsByClassSubjectId={planningPage.teacherLabelsByClassSubjectId}
						school={academicContext.schools[0]}
						bind:selectedClassId
						bind:overrides
						bind:minSpanOverrides
						bind:maxSpanOverrides
						disabled={planningPage.busy || generating}
					/>
				{:else if setupTab === 'periods'}
					<TimetablePreferredPeriodsPanel {periods} bind:preferredIds />
				{:else}
					<TimetableSolverOptionsPanel
						bind:enforceWorkloadFulfillment
						bind:excludeBreakSlots
						bind:allowUnassignedTeacherPlacements
						bind:useHomeroomTeacherFallback
						bind:minDayGapSameSubject
						bind:timetableMinPeriodSpan
						bind:timetableMaxPeriodSpan
						schoolId={academicContext.schools[0]?.id ?? ''}
						bind:schoolRaw
						showSchoolDefaults
					/>
				{/if}
			</div>
		</div>
	{/if}

	{#snippet footer({ close, submit, busy, submitDisabled })}
		{#if viewPhase === 'success' || viewPhase === 'error'}
			<Button variant="ghost" onclick={runAgain} disabled={busy}>{$t('timetable.runAgain')}</Button>
			<Button onclick={close} disabled={busy}>{$t('common.close')}</Button>
		{:else}
			<Button variant="ghost" onclick={close} disabled={busy}>{$t('common.cancel')}</Button>
			{#if viewPhase !== 'generating'}
				<Button class="h-auto min-h-10 whitespace-normal" data-testid="timetable-generate-submit" onclick={submit} disabled={busy || submitDisabled}>{$t(selectedClasses.length === 1 ? 'timetable.generateSelectedClass' : 'timetable.generateSelectedClasses', { count: selectedClasses.length })}</Button>
			{/if}
		{/if}
	{/snippet}
</FormModal>
