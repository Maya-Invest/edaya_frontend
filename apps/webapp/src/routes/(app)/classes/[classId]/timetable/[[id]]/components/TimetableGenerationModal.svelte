<script lang="ts">
	import type { SchoolRaw } from '$lib/api/school-data';
	import type { TimetableGenerationError } from '$lib/components/school/scheduling/timetable-generation-errors';
	import type { TimetableSetupTab } from '$lib/components/school/scheduling/TimetableGenerationSetupTabs.svelte';
	import type { GenerateClassResult, RepublishResult, TimetableGenerationOptions, TimetablePageState } from '../../timetable-page.svelte';
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

	let {
		open = $bindable(false),
		state: timetablePage,
		mode = 'generate',
	}: {
		open?: boolean;
		state: TimetablePageState;
		mode?: 'generate' | 'republish';
	} = $props();

	type Phase = 'setup' | 'success' | 'error';

	let phase = $state<Phase>('setup');
	let startDate = $state('');
	let endDate = $state('');
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
	let policy = $state<'fail' | 'skip'>('fail');
	let overrides = $state<Record<string, number>>({});
	let minSpanOverrides = $state<Record<string, number>>({});
	let maxSpanOverrides = $state<Record<string, number>>({});
	let classResult = $state<GenerateClassResult | null>(null);
	let republishResult = $state<RepublishResult | null>(null);
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
	const classSubjectLabels = $derived(Object.fromEntries(
		timetablePage.classSubjects.map(subject => [
			subject.id,
			timetablePage.subjectLabels[subject.subjectId] ?? subject.subjectId,
		]),
	));
	const workloadClasses = $derived.by(() => {
		const classId = timetablePage.classId;
		const match = academicContext.classes.find(row => row.id === classId);
		if (match) {
			return [{ id: match.id, name: match.name }];
		}
		return classId ? [{ id: classId, name: classId }] : [];
	});
	const workloadLoading = $derived(timetablePage.teacherConstraintsLoading);
	const rangeLabel = $derived(`${startDate} – ${endDate}`);
	const modalTitle = $derived(
		phase === 'error'
			? (mode === 'republish' ? $t('timetable.republishErrorTitle') : $t('timetable.generateErrorTitle'))
			: phase === 'success'
			? (mode === 'republish' ? $t('timetable.republishResultTitle') : $t('timetable.generateResultTitle'))
			: (mode === 'republish' ? $t('timetable.republishTitle') : $t('timetable.generateTitle')),
	);
	const modalDescription = $derived(
		phase === 'error'
			? $t('timetable.errorReviewHint')
			: phase === 'success'
			? $t('timetable.resultReviewHint')
			: (mode === 'republish' ? $t('timetable.republishHint') : $t('timetable.generateHint')),
	);

	function initializeForm() {
		const range = timetablePage.periodRange;
		startDate = range.startDate;
		endDate = range.endDate;
		policy = 'fail';
		overrides = {};
		minSpanOverrides = {};
		maxSpanOverrides = {};
		classResult = null;
		republishResult = null;
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
			return;
		}
		phase = 'setup';
		classResult = null;
		republishResult = null;
		generationError = null;
	}

	$effect(() => {
		if (!open) {
			return;
		}
		phase = 'setup';
		initializeForm();
		void timetablePage.loadTeacherConstraints();
	});

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
		if (mode === 'republish') {
			const outcome = await timetablePage.republish({
				startDate,
				endDate,
				policy,
				options: buildOptions(),
				periodsPerWeekByClassSubjectId: overrides,
				minPeriodSpanByClassSubjectId: minSpanOverrides,
				maxPeriodSpanByClassSubjectId: maxSpanOverrides,
			});
			if (outcome.ok) {
				republishResult = outcome.value;
				phase = 'success';
			}
			else {
				generationError = outcome.error;
				phase = 'error';
			}
			return;
		}

		const outcome = await timetablePage.generate({
			startDate,
			endDate,
			options: buildOptions(),
			periodsPerWeekByClassSubjectId: overrides,
			minPeriodSpanByClassSubjectId: minSpanOverrides,
			maxPeriodSpanByClassSubjectId: maxSpanOverrides,
		});
		if (outcome.ok) {
			classResult = outcome.value;
			phase = 'success';
		}
		else {
			generationError = outcome.error;
			phase = 'error';
		}
	}

	function runAgain() {
		phase = 'setup';
		classResult = null;
		republishResult = null;
		generationError = null;
	}
</script>

<FormModal
	bind:open
	title={modalTitle}
	description={modalDescription}
	contentClass={timetableGenerationModalContentClass(phase)}
	bodyClass={phase === 'setup' ? TIMETABLE_GENERATION_MODAL_SETUP_BODY_CLASS : undefined}
	busy={timetablePage.busy}
	submitDisabled={!validRange}
	onSubmit={submit}
	onOpenChange={handleModalOpenChange}
>
	{#if phase === 'error' && generationError}
		<TimetableGenerationErrorPanel
			error={generationError}
			{rangeLabel}
			titleKey={mode === 'republish' ? 'timetable.republishErrorTitle' : 'timetable.generateErrorTitle'}
		/>
	{:else if phase === 'success'}
		<TimetableGenerationResultPanel
			{mode}
			{classResult}
			{republishResult}
			subjectLabels={classSubjectLabels}
			{rangeLabel}
		/>
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
						activeClassId={timetablePage.classId}
						classSubjects={timetablePage.classSubjects}
						subjectLabels={timetablePage.subjectLabels}
						teacherLabelsByClassSubjectId={timetablePage.teacherLabelsByClassSubjectId}
						school={academicContext.schools[0]}
						loading={workloadLoading}
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
						bind:policy
						showRepublishPolicy={mode === 'republish'}
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
			<Button onclick={submit} disabled={busy || submitDisabled}>
				{mode === 'republish' ? $t('timetable.republish') : $t('timetable.generateDraft')}
			</Button>
		{/if}
	{/snippet}
</FormModal>
