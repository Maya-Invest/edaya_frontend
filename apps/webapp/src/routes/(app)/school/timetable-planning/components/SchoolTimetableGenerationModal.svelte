<script lang="ts">
	import type { GenerateSchoolResult } from '$lib/api/mutations/timetable-generation.mutations';
	import type { SchoolRaw } from '$lib/api/school-data';
	import type { TimetableGenerationError } from '$lib/components/school/scheduling/timetable-generation-errors';
	import type { TimetableSetupTab } from '$lib/components/school/scheduling/TimetableGenerationSetupTabs.svelte';
	import type { TimetableGenerationOptions, TimetablePlanningPageState } from '../timetable-planning-page.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { fetchSchoolById } from '$lib/api/school-data';
	import { buildTimetableRangePresets, timetableGenerationModalContentClass, TIMETABLE_GENERATION_MODAL_SETUP_BODY_CLASS, TIMETABLE_GENERATION_MODAL_SETUP_LAYOUT_CLASS, TIMETABLE_GENERATION_MODAL_TAB_PANEL_CLASS } from '$lib/components/school/scheduling/timetable-generation-ui';
	import TimetableGenerationErrorPanel from '$lib/components/school/scheduling/TimetableGenerationErrorPanel.svelte';
	import TimetableGenerationResultPanel from '$lib/components/school/scheduling/TimetableGenerationResultPanel.svelte';
	import TimetableGenerationSetupTabs from '$lib/components/school/scheduling/TimetableGenerationSetupTabs.svelte';
	import TimetablePreferredPeriodsPanel from '$lib/components/school/scheduling/TimetablePreferredPeriodsPanel.svelte';
	import TimetableRangeSelector from '$lib/components/school/scheduling/TimetableRangeSelector.svelte';
	import TimetableSolverOptionsPanel from '$lib/components/school/scheduling/TimetableSolverOptionsPanel.svelte';
	import TimetableWorkloadConfigPanel from '$lib/components/school/scheduling/TimetableWorkloadConfigPanel.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { formatDateInput } from '$lib/date/format';
	import { t } from '$lib/i18n';

	let { open = $bindable(false), state: planningPage }: { open?: boolean; state: TimetablePlanningPageState } = $props();

	type Phase = 'setup' | 'success' | 'error';

	let phase = $state<Phase>('setup');
	let startDate = $state('');
	let endDate = $state('');
	let selectedClassId = $state('');
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
	let setupTab = $state<TimetableSetupTab>('subjects');

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
	const workloadClasses = $derived(planningPage.classes.map(row => ({ id: row.id, name: row.name })));
	const classLabels = $derived(Object.fromEntries(planningPage.classes.map(row => [row.id, row.name])));
	const rangeLabel = $derived(`${startDate} – ${endDate}`);
	const modalTitle = $derived(
		phase === 'error'
			? $t('timetable.schoolGenerateErrorTitle')
			: phase === 'success'
			? $t('timetable.schoolGenerateResultTitle')
			: $t('timetable.schoolGenerateTitle'),
	);
	const modalDescription = $derived(
		phase === 'error'
			? $t('timetable.errorReviewHint')
			: phase === 'success'
			? $t('timetable.resultReviewHint')
			: $t('timetable.schoolGenerateHint'),
	);

	function initializeForm() {
		({ startDate, endDate } = planningPage.range);
		selectedClassId = planningPage.classes[0]?.id ?? '';
		overrides = {};
		minSpanOverrides = {};
		maxSpanOverrides = {};
		schoolResult = null;
		generationError = null;
		setupTab = 'subjects';
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
			void fetchSchoolById(getBrowserSchoolClient(), school.id).then((raw) => {
				schoolRaw = raw;
			});
		}
	}

	function handleModalOpenChange(isOpen: boolean) {
		if (isOpen) {
			phase = 'setup';
			initializeForm();
			return;
		}
		phase = 'setup';
		schoolResult = null;
		generationError = null;
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
		if (preferredIds.length) {
			value.preferredPeriodDefinitionIds = preferredIds;
		}
		return Object.keys(value).length ? value : undefined;
	}

	async function submit() {
		if (!validRange) {
			return;
		}
		const outcome = await planningPage.generate({
			startDate,
			endDate,
			options: buildOptions(),
			periodsPerWeekByClassSubjectId: overrides,
			minPeriodSpanByClassSubjectId: minSpanOverrides,
			maxPeriodSpanByClassSubjectId: maxSpanOverrides,
		});
		if (outcome.ok) {
			schoolResult = outcome.value;
			phase = 'success';
		}
		else {
			generationError = outcome.error;
			phase = 'error';
		}
	}

	function runAgain() {
		phase = 'setup';
		schoolResult = null;
		generationError = null;
	}
</script>

<FormModal
	bind:open
	title={modalTitle}
	description={modalDescription}
	contentClass={timetableGenerationModalContentClass(phase)}
	bodyClass={phase === 'setup' ? TIMETABLE_GENERATION_MODAL_SETUP_BODY_CLASS : undefined}
	busy={planningPage.busy}
	submitDisabled={!validRange || !planningPage.canGenerateSchoolInitial}
	onSubmit={submit}
	onOpenChange={handleModalOpenChange}
>
	{#if phase === 'error' && generationError}
		<TimetableGenerationErrorPanel
			error={generationError}
			{rangeLabel}
			titleKey="timetable.schoolGenerateErrorTitle"
		/>
	{:else if phase === 'success' && schoolResult}
		<TimetableGenerationResultPanel mode="school" {schoolResult} {classLabels} {rangeLabel} />
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

				<TimetableGenerationSetupTabs bind:activeTab={setupTab} />
			</div>

			<div class={TIMETABLE_GENERATION_MODAL_TAB_PANEL_CLASS}>
				{#if setupTab === 'subjects'}
					<TimetableWorkloadConfigPanel
						classes={workloadClasses}
						classSubjects={planningPage.classSubjects}
						subjectLabels={planningPage.subjectLabels}
						teacherLabelsByClassSubjectId={planningPage.teacherLabelsByClassSubjectId}
						school={academicContext.schools[0]}
						bind:selectedClassId
						bind:overrides
						bind:minSpanOverrides
						bind:maxSpanOverrides
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
		{#if phase === 'success' || phase === 'error'}
			<Button variant="ghost" onclick={runAgain} disabled={busy}>{$t('timetable.runAgain')}</Button>
			<Button onclick={close} disabled={busy}>{$t('common.close')}</Button>
		{:else}
			<Button variant="ghost" onclick={close} disabled={busy}>{$t('common.cancel')}</Button>
			<Button onclick={submit} disabled={busy || submitDisabled}>{$t('timetable.generateSchool')}</Button>
		{/if}
	{/snippet}
</FormModal>
