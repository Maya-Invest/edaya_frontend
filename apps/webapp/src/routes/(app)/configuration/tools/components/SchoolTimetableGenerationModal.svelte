<script lang="ts">
	import type { GenerateSchoolResult } from '$lib/api/mutations/timetable-generation.mutations';

	import type { SchoolRaw } from '$lib/api/school-data';
	import type { TimetableGenerationError } from '../lib/timetable-generation-errors';
	import type { TimetableGenerationStep } from '../lib/tools-workflow';
	import type { TimetableGenerationOptions, TimetablePlanningPageState } from '../timetable-planning-page.svelte';
	import type { TimetableSetupTab } from './TimetableGenerationSetupTabs.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import TaskSteps from '$lib/components/ui/TaskSteps.svelte';
	import { formatDateInput, parseCivilDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { untrack } from 'svelte';
	import { buildTimetableRangePresets, TIMETABLE_GENERATION_MODAL_SETUP_BODY_CLASS, TIMETABLE_GENERATION_MODAL_SETUP_LAYOUT_CLASS, TIMETABLE_GENERATION_MODAL_TAB_PANEL_CLASS } from '../lib/timetable-generation-ui';
	import { scopedTimetableOverrides, timetableTaskOptions, validTimetableTaskNumbers } from '../lib/timetable-task';
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
	const setupId = $props.id();

	let {
		open = $bindable(false),
		state: planningPage,
		phase,
		setupTab,
		onPhaseChange,
		onSetupTabChange,
		onInvalidPhase,
		retainsDraft,
	}: {
		open?: boolean;
		state: TimetablePlanningPageState;
		phase: TimetableGenerationStep;
		setupTab: TimetableSetupTab;
		onPhaseChange: (phase: TimetableGenerationStep) => void;
		onSetupTabChange: (tab: TimetableSetupTab) => void;
		onInvalidPhase: (phase: TimetableGenerationStep) => void;
		retainsDraft?: (destination: URL) => boolean;
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
	let formGeneration = 0;
	let unavailableResult = $state(false);
	let baseline = $state('');
	let spanBaseline = $state('');
	let savingDefaults = $state(false);
	const spanDraft = $derived(JSON.stringify([timetableMinPeriodSpan, timetableMaxPeriodSpan]));
	const unsavedDefaults = $derived(spanBaseline !== '' && spanDraft !== spanBaseline);
	const dirty = $derived(open && !generating && baseline !== '' && (draftSignature() !== baseline || unsavedDefaults));

	function draftSignature() {
		return JSON.stringify([startDate, endDate, selectedClassGroupIds, buildOptions(), overrides, minSpanOverrides, maxSpanOverrides]);
	}
	function choosePhase(value: string) {
		if (value === 'range' || value === 'selection' || value === 'review' || value === 'success' || value === 'error')
			onPhaseChange(value);
	}
	$effect(() => {
		if (schoolRaw)
			spanBaseline = JSON.stringify([String(schoolRaw.timetableMinPeriodSpan), String(schoolRaw.timetableMaxPeriodSpan)]);
	});

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
	const viewPhase = $derived(generating ? 'generating' as const : phase);
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
		const generation = ++formGeneration;
		formScope = `${academicContext.schools[0]?.id ?? ''}:${academicContext.yearId}:${authSession.subjectId ?? ''}`;
		generating = false;
		unavailableResult = false;
		savingDefaults = false;
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
		baseline = draftSignature();
		spanBaseline = JSON.stringify([timetableMinPeriodSpan, timetableMaxPeriodSpan]);
		if (school) {
			void actionState.loadSchoolForForm(school.id).then((raw) => {
				if (generation === formGeneration && open)
					schoolRaw = raw;
			});
		}
	}

	$effect(() => {
		const isOpen = open;
		// Reset drafts when academic scope changes while the form is open.
		const scope = `${academicContext.schools[0]?.id ?? ''}:${academicContext.yearId}:${authSession.subjectId ?? ''}`;
		untrack(() => {
			const changedScope = isOpen && formScope && scope !== formScope;
			handleModalOpenChange(isOpen);
			if (changedScope)
				onPhaseChange('range');
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
		formGeneration += 1;
		savingDefaults = false;
		schoolResult = null;
		generationError = null;
		generating = false;
	}

	function buildOptions(): TimetableGenerationOptions {
		return timetableTaskOptions({ generationMode, preferredPeriodDefinitionIds: preferredIds, minDayGapSameSubject, enforceWorkloadFulfillment, excludeBreakSlots, allowUnassignedTeacherPlacements, useHomeroomTeacherFallback });
	}
	function includedOverrides(values: Record<string, number>): Record<string, number> {
		return scopedTimetableOverrides(selectedClassSubjects.map(subject => subject.id), values);
	}
	const validNumbers = $derived(validTimetableTaskNumbers(minDayGapSameSubject, includedOverrides(overrides), includedOverrides(minSpanOverrides), includedOverrides(maxSpanOverrides)));

	const steps = $derived([
		{ key: 'range', label: $t('timetable.stage.range'), disabled: generating || savingDefaults },
		{ key: 'selection', label: $t('timetable.stage.selection'), disabled: generating || savingDefaults || !validRange, reason: !validRange ? $t('timetable.invalidRange') : undefined },
		{ key: 'review', label: $t('timetable.stage.review'), disabled: generating || savingDefaults || !validRange || !selectedClasses.length || unsavedDefaults || !validNumbers, reason: !validNumbers ? $t('timetable.invalidTaskNumbers') : unsavedDefaults ? $t('timetable.unsavedDefaults') : !selectedClasses.length ? $t('timetable.invalidClassSelection') : undefined },
		{ key: schoolResult ? 'success' : 'error', label: $t('timetable.stage.result'), disabled: generating || (!schoolResult && !generationError) },
	]);
	async function submit() {
		if (phase !== 'review' || !validNumbers || !validRange || !selectedClasses.length || generating || planningPage.busy || savingDefaults || unsavedDefaults || !planningPage.canGenerateSchoolInitial) {
			return;
		}
		generating = true;
		const runScope = formScope;
		const generation = formGeneration;
		const submittedDraft = draftSignature();
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
			if (formScope !== runScope || generation !== formGeneration || !open)
				return;
			if (outcome.ok) {
				schoolResult = outcome.value;
				baseline = submittedDraft;
				onPhaseChange('success');
			}
			else {
				generationError = outcome.error;
				onPhaseChange('error');
			}
		}
		finally {
			if (formScope === runScope && generation === formGeneration)
				generating = false;
		}
	}

	function runAgain() {
		schoolResult = null;
		generationError = null;
		generating = false;
		onPhaseChange('range');
	}

	$effect(() => {
		if (!open) {
			return;
		}
		if (phase === 'success' && !schoolResult) {
			unavailableResult = true;
			onInvalidPhase('range');
		}
		else if (phase === 'error' && !generationError) {
			onInvalidPhase('range');
		}
	});
</script>

<FormModal
	presentation="task"
	bind:open
	title={modalTitle}
	description={modalDescription}
	{dirty}
	{retainsDraft}
	bodyClass={viewPhase === 'selection' ? TIMETABLE_GENERATION_MODAL_SETUP_BODY_CLASS : undefined}
	busy={planningPage.busy || savingDefaults}
	submitDisabled={phase !== 'review' || !validNumbers || !validRange || !selectedClasses.length || unsavedDefaults || !planningPage.canGenerateSchoolInitial}
	onSubmit={submit}
>
	{#snippet navigation()}<TaskSteps label={$t('timetable.schoolGenerateTitle')} {steps} current={viewPhase === 'generating' ? 'review' : viewPhase} onSelect={choosePhase} />{/snippet}
	{#if unavailableResult}<p role="status" class="rounded-collection border p-4">{$t('timetable.resultUnavailable')}</p>{/if}
	{#if viewPhase === 'error' && generationError}
		<TimetableGenerationErrorPanel
			error={generationError}
			{rangeLabel}
		/>
	{:else if viewPhase === 'success' && schoolResult}
		<TimetableGenerationResultPanel mode="school" {schoolResult} {classLabels} {rangeLabel} />
	{:else if viewPhase === 'generating'}
		<div class="space-y-4 py-2">
			<p role="status" class="text-sm text-muted-foreground">{$t('timetable.runningTask')}</p>
		</div>
	{:else if viewPhase === 'range'}
		<div class="max-w-lg"><TimetableRangeSelector bind:startDate bind:endDate bind:generationMode showGenerationMode presets={rangePresets} {validRange} /></div>
	{:else if viewPhase === 'review'}
		<section class="space-y-6" aria-label={$t('timetable.stage.review')}>
			<p class="text-sm">{rangeLabel} · {academicContext.schools[0]?.timeZone ?? $t('dataState.unavailable')}</p>
			<p class="text-sm">{$t('timetable.schoolGenerateHint')}</p>
			<section class="space-y-4"><h2 class="font-display text-xl font-semibold">{$t('timetable.classesToGenerate')}</h2><ul class="space-y-2">{#each selectedClasses as selected (selected.id)}<li class="break-words text-sm">{selected.name}</li>{/each}</ul></section>
			<section class="space-y-4"><h2 class="font-display text-xl font-semibold">{$t('timetable.solverOptions')}</h2>
				<dl class="grid gap-4 md:grid-cols-2">
					<div><dt class="text-xs text-muted-foreground">{$t('timetable.generationMode')}</dt><dd class="text-sm">{$t(generationMode === 'weekly' ? 'timetable.generationModeWeeklyShort' : 'timetable.generationModeFreeShort')}</dd></div>
					{#each [['timetable.enforceWorkload', enforceWorkloadFulfillment], ['timetable.excludeBreaks', excludeBreakSlots], ['timetable.allowUnassignedTeachers', allowUnassignedTeacherPlacements], ['timetable.homeroomTeacherFallback', useHomeroomTeacherFallback]] as [label, value] (String(label))}<div><dt class="text-xs text-muted-foreground">{$t(String(label))}</dt><dd class="text-sm">{value === undefined ? $t('timetable.inheritedSetting') : $t(value ? 'common.yes' : 'common.no')}</dd></div>{/each}
					<div><dt class="text-xs text-muted-foreground">{$t('timetable.sameSubjectDayGap')}</dt><dd class="text-sm tabular-nums">{minDayGapSameSubject || $t('timetable.inheritedSetting')}</dd></div>
				</dl>
			</section>
			<section class="space-y-4"><h2 class="font-display text-xl font-semibold">{$t('timetable.preferredPeriods')}</h2><ul class="space-y-2">{#each preferredIds as id (id)}{@const period = periods.find(value => value.id === id)}<li class="text-sm">{period ? `${period.label} · ${period.startTime}–${period.endTime}` : $t('dataState.unavailable')}</li>{:else}<li class="text-sm">{$t('timetable.noPreferredPeriods')}</li>{/each}</ul></section>
			<section class="space-y-4"><h2 class="font-display text-xl font-semibold">{$t('timetable.workloadOverrides')}</h2><ul class="space-y-4">{#each selectedClassSubjects.filter(subject => overrides[subject.id] !== undefined || minSpanOverrides[subject.id] !== undefined || maxSpanOverrides[subject.id] !== undefined) as subject (subject.id)}<li class="text-sm"><p class="font-semibold">{classLabels[subject.classGroupId]} · {planningPage.subjectLabels[subject.subjectId] ?? $t('dataState.unavailable')}</p><p class="tabular-nums">{$t('timetable.reviewOverride', { workload: overrides[subject.id] ?? $t('timetable.inheritedSetting'), min: minSpanOverrides[subject.id] ?? $t('timetable.inheritedSetting'), max: maxSpanOverrides[subject.id] ?? $t('timetable.inheritedSetting') })}</p></li>{:else}<li class="text-sm">{$t('timetable.inheritedSetting')}</li>{/each}</ul></section>
		</section>
	{:else}
		<div class={TIMETABLE_GENERATION_MODAL_SETUP_LAYOUT_CLASS}>
			<div class="shrink-0 space-y-4">
				<TimetableGenerationSetupTabs id={setupId} disabled={savingDefaults}
					bind:activeTab={() => setupTab, onSetupTabChange}
				/>
			</div>

			<div class={TIMETABLE_GENERATION_MODAL_TAB_PANEL_CLASS} role="tabpanel" id={`${setupId}-panel-${setupTab}`} aria-labelledby={`${setupId}-${setupTab}`} tabindex="0">
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
						bind:savingDefaults
						showSchoolDefaults
					/>
				{/if}
			</div>
		</div>
	{/if}

	{#if !validNumbers}<p role="alert" class="text-sm text-destructive">{$t('timetable.invalidTaskNumbers')}</p>{/if}
	{#if unsavedDefaults}<p role="status" class="text-sm">{$t('timetable.unsavedDefaults')}</p>{/if}
	{#snippet footer({ close, submit, busy, submitDisabled })}
		<Button variant="outline" onclick={close}>{$t('common.close')}</Button>
		{#if viewPhase === 'success' || viewPhase === 'error'}
			<Button variant="outline" onclick={runAgain} disabled={busy}>{$t('timetable.runAgain')}</Button>
		{:else if viewPhase === 'range'}
			<Button disabled={!validRange || busy} onclick={() => onPhaseChange('selection')}>{$t('timetable.stage.selection')}</Button>
		{:else if viewPhase === 'selection'}
			<Button variant="outline" disabled={busy} onclick={() => onPhaseChange('range')}>{$t('common.back')}</Button>
			<Button data-testid="timetable-review-scope" disabled={!validNumbers || !validRange || !selectedClasses.length || unsavedDefaults || busy} onclick={() => onPhaseChange('review')}>{$t('timetable.stage.review')}</Button>
		{:else if viewPhase === 'review'}
			<Button variant="outline" disabled={busy} onclick={() => onPhaseChange('selection')}>{$t('common.back')}</Button>
			<Button data-testid="timetable-generate-submit" onclick={submit} disabled={busy || submitDisabled}>{$t(selectedClasses.length === 1 ? 'timetable.generateSelectedClass' : 'timetable.generateSelectedClasses', { count: selectedClasses.length })}</Button>
		{:else}<p role="status" class="text-sm">{$t('timetable.runningTask')}</p>{/if}
	{/snippet}
</FormModal>
