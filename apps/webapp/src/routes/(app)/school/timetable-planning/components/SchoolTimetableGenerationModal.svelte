<script lang="ts">
	import type { TimetableGenerationOptions, TimetablePlanningPageState } from '../timetable-planning-page.svelte';
	import type { GenerateSchoolResult } from '$lib/api/mutations/timetable-generation.mutations';
	import type { TimetableGenerationError } from '$lib/components/school/scheduling/timetable-generation-errors';
	import TimetableGenerationResultPanel from '$lib/components/school/scheduling/TimetableGenerationResultPanel.svelte';
	import TimetableGenerationErrorPanel from '$lib/components/school/scheduling/TimetableGenerationErrorPanel.svelte';
	import TimetableGenerationSetupTabs, { type TimetableSetupTab } from '$lib/components/school/scheduling/TimetableGenerationSetupTabs.svelte';
	import TimetableRangeSelector from '$lib/components/school/scheduling/TimetableRangeSelector.svelte';
	import TimetablePreferredPeriodsPanel from '$lib/components/school/scheduling/TimetablePreferredPeriodsPanel.svelte';
	import TimetableSolverOptionsPanel from '$lib/components/school/scheduling/TimetableSolverOptionsPanel.svelte';
	import TimetableWorkloadConfigPanel from '$lib/components/school/scheduling/TimetableWorkloadConfigPanel.svelte';
	import { buildTimetableRangePresets } from '$lib/components/school/scheduling/timetable-generation-ui';
	import { academicContext } from '$lib/academic/context.svelte';
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
	let generationMode = $state<'weekly' | 'free' | undefined>();
	let excludeBreakSlots = $state<boolean | undefined>();
	let allowUnassignedTeacherPlacements = $state<boolean | undefined>();
	let useHomeroomTeacherFallback = $state<boolean | undefined>();
	let minDayGapSameSubject = $state('');
	let preferredIds = $state<string[]>([]);
	let overrides = $state<Record<string, number>>({});
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
		preferredIds = [...(school?.timetablePreferredPeriodDefinitionIds ?? [])];
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
		const value: TimetableGenerationOptions = {};
		if (generationMode) {
			value.generationMode = generationMode;
		}
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
			periodsPerWeekByClassSubjectId: Object.keys(overrides).length ? overrides : undefined,
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
	contentClass={phase === 'setup' ? 'max-w-3xl' : 'max-w-2xl'}
	busy={planningPage.busy}
	submitDisabled={!validRange || !planningPage.canGenerateSchoolInitial}
	onSubmit={submit}
	onOpenChange={handleModalOpenChange}
>
	{#snippet children()}
		{#if phase === 'error' && generationError}
			<TimetableGenerationErrorPanel
				error={generationError}
				{rangeLabel}
				titleKey="timetable.schoolGenerateErrorTitle"
			/>
		{:else if phase === 'success' && schoolResult}
			<TimetableGenerationResultPanel mode="school" {schoolResult} {classLabels} {rangeLabel} />
		{:else}
			<div class="space-y-4">
				<TimetableRangeSelector bind:startDate bind:endDate presets={rangePresets} {validRange} />

				<TimetableGenerationSetupTabs bind:activeTab={setupTab} />

				{#if setupTab === 'subjects'}
					<TimetableWorkloadConfigPanel
						classes={workloadClasses}
						classSubjects={planningPage.classSubjects}
						subjectLabels={planningPage.subjectLabels}
						teacherLabelsByClassSubjectId={planningPage.teacherLabelsByClassSubjectId}
						bind:selectedClassId
						bind:overrides
					/>
				{:else if setupTab === 'periods'}
					<TimetablePreferredPeriodsPanel {periods} bind:preferredIds />
				{:else}
					<TimetableSolverOptionsPanel
						bind:generationMode
						bind:enforceWorkloadFulfillment
						bind:excludeBreakSlots
						bind:allowUnassignedTeacherPlacements
						bind:useHomeroomTeacherFallback
						bind:minDayGapSameSubject
					/>
				{/if}
			</div>
		{/if}
	{/snippet}

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
