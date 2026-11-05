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
	import { formatDateInput, parseCivilDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { LoaderCircle } from '$lib/icons';
	import { hasPermission } from '$lib/permissions';
	import { eligiblePreferredPeriodIds } from '$lib/scheduling/preferred-periods';
	import { resolvedPeriodSpanPlaceholder } from '$lib/scheduling/timetable-placement-parameters';
	import { tick, untrack } from 'svelte';
	import { buildTimetableRangePresets } from '../lib/timetable-generation-ui';
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

	let {
		open = $bindable(false),
		state: planningPage,
		phase,
		setupTab,
		onSetupTabChange,
		onPhaseChange,
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
	let elapsedSeconds = $state(0);
	$effect(() => {
		if (!generating)
			return;
		const startedAt = Date.now();
		elapsedSeconds = 0;
		const timer = setInterval(() => {
			elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
		}, 1000);
		return () => clearInterval(timer);
	});
	const elapsedLabel = $derived(`${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`);
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
	let savingDefaults = $state(false);
	let defaultsOpen = $state(false);
	const dirty = $derived(open && !generating && baseline !== '' && (draftSignature() !== baseline));

	function draftSignature() {
		return JSON.stringify([startDate, endDate, selectedClassGroupIds, buildOptions(), overrides, minSpanOverrides, maxSpanOverrides]);
	}

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
		formGeneration += 1;
		savingDefaults = false;
		schoolResult = null;
		generationError = null;
		generating = false;
	}

	function buildOptions(): TimetableGenerationOptions {
		return timetableTaskOptions({ generationMode, preferredPeriodDefinitionIds: eligiblePreferredPeriodIds(periods, preferredIds), minDayGapSameSubject, enforceWorkloadFulfillment, excludeBreakSlots, allowUnassignedTeacherPlacements, useHomeroomTeacherFallback });
	}
	function includedOverrides(values: Record<string, number>): Record<string, number> {
		return scopedTimetableOverrides(selectedClassSubjects.map(subject => subject.id), values);
	}
	const invalidSubject = $derived(selectedClassSubjects.find((subject) => {
		const inherited = resolvedPeriodSpanPlaceholder(subject, academicContext.schools[0]);
		return !validTimetableTaskNumbers('', { value: overrides[subject.id] ?? subject.periodsPerWeek ?? 0 }, { value: minSpanOverrides[subject.id] ?? inherited.min }, { value: maxSpanOverrides[subject.id] ?? inherited.max });
	}));
	const validRules = $derived(validTimetableTaskNumbers(minDayGapSameSubject, {}, {}, {}));
	const validNumbers = $derived(!invalidSubject && validRules);

	async function submit() {
		if (phase !== 'setup' || !validNumbers || !validRange || !selectedClasses.length || generating || planningPage.busy || savingDefaults || !planningPage.canGenerateSchoolInitial) {
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

	async function focusPanel(tab: TimetableSetupTab) {
		if (tab === 'subjects' && invalidSubject)
			selectedClassId = invalidSubject.classGroupId;
		onSetupTabChange(tab);
		await tick();
		const panel = document.getElementById(`timetable-setup-panel-${tab}`);
		panel?.querySelectorAll('details').forEach(detail => detail.open = true);
		panel?.querySelector<HTMLElement>('input:invalid, input, button')?.focus();
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
			unavailableResult = true;
			onInvalidPhase('setup');
		}
		else if (phase === 'error' && !generationError) {
			onInvalidPhase('setup');
		}
	});
</script>

<FormModal
	presentation="assistant"
	bind:open
	title={modalTitle}
	description={viewPhase === 'success' || viewPhase === 'error' ? modalDescription : undefined}
	{dirty}
	{retainsDraft}
	bodyClass={viewPhase === 'setup' ? 'timetable-setup-body' : viewPhase === 'generating' ? 'timetable-progress-body' : undefined}
	busy={planningPage.busy || savingDefaults}
	submitDisabled={phase !== 'setup' || !validNumbers || !validRange || !selectedClasses.length || !planningPage.canGenerateSchoolInitial}
	onSubmit={submit}
>

	{#if unavailableResult}<p role="status" class="rounded-collection border p-4">{$t('timetable.resultUnavailable')}</p>{/if}
	{#if viewPhase === 'error' && generationError}
		<TimetableGenerationErrorPanel
			error={generationError}
			{rangeLabel}
		/>
	{:else if viewPhase === 'success' && schoolResult}
		<TimetableGenerationResultPanel mode="school" {schoolResult} {classLabels} {rangeLabel} />
	{:else if viewPhase === 'generating'}
		<section data-testid="timetable-generation-progress" class="generation-progress" aria-labelledby="generation-progress-title">
			<div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><LoaderCircle class="h-8 w-8 motion-safe:animate-spin" aria-hidden="true" /></div>
			<h2 id="generation-progress-title" class="font-display text-xl font-semibold" role="status">{$t(planningPage.generationPhase === 'refreshing' ? 'timetable.progressRefreshing' : 'timetable.progressGenerating')}</h2>
			<p class="text-sm text-muted-foreground">{$t('timetable.progressScope', { count: selectedClasses.length })}<br />{rangeLabel}</p>
			<progress class="generation-progress-bar" aria-label={$t('timetable.progressGenerating')}></progress>
			<p class="text-sm tabular-nums text-muted-foreground">{$t('timetable.progressElapsed', { time: elapsedLabel })}</p>
			<p class="max-w-md text-sm text-muted-foreground">{$t('timetable.progressExplanation')}</p>
		</section>
	{:else}
		<div class="timetable-setup">
			<div class="timetable-setup-top">
				<TimetableRangeSelector bind:startDate bind:endDate bind:generationMode showGenerationMode presets={rangePresets} {validRange} />
				<p class="text-xs text-muted-foreground">{academicContext.schools[0]?.timeZone}</p>
				<p class="compact-impact text-xs text-muted-foreground">{$t('timetable.assistantImpact')}</p>
				<TimetableGenerationSetupTabs id="timetable-setup" activeTab={setupTab} onTabChange={onSetupTabChange} invalidTabs={[...(!selectedClasses.length || invalidSubject ? ['subjects' as const] : []), ...(!validRules ? ['advanced' as const] : [])]} />
			</div>
			<div class="timetable-setup-panel" id={`timetable-setup-panel-${setupTab}`} role="tabpanel" aria-labelledby={`timetable-setup-${setupTab}`}>
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
						showSchoolDefaults={false}
					/>
					{#if hasPermission('SCHOOL_CONFIGURE')}<Button variant="ghost" onclick={() => defaultsOpen = true}>{$t('timetable.saveSchoolDefaults')}</Button>{/if}
				{/if}
			</div>
		</div>
	{/if}

	{#if viewPhase === 'setup' && (!validNumbers || !selectedClasses.length)}
		<div role="alert" class="text-sm text-destructive">
			{#if !validNumbers}<p>{$t('timetable.invalidTaskNumbers')}</p>{/if}
			{#if !selectedClasses.length}<p>{$t('timetable.invalidClassSelection')}</p>{/if}
			<Button variant="ghost" onclick={() => focusPanel('subjects')}>{$t('timetable.tabSubjects')}</Button>
			{#if !validNumbers}<Button variant="ghost" onclick={() => focusPanel('advanced')}>{$t('timetable.tabAdvanced')}</Button>{/if}
		</div>
	{/if}

	{#snippet footer({ close, submit, busy, submitDisabled })}
		{#if viewPhase === 'success' || viewPhase === 'error'}
			<Button variant="ghost" onclick={close}>{$t('common.close')}</Button>
			<Button onclick={runAgain} disabled={busy}>{$t('timetable.modifyConfiguration')}</Button>
		{:else if viewPhase === 'setup'}
			<div class="setup-footer-summary flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground"><span>{rangeLabel}</span><span>{$t('timetable.assistantImpact')}</span></div>
			<Button data-testid="timetable-generate-submit" onclick={submit} disabled={busy || submitDisabled}>{$t(selectedClasses.length === 1 ? 'timetable.generateSelectedClass' : 'timetable.generateSelectedClasses', { count: selectedClasses.length })}</Button>
		{:else}<p class="text-sm text-muted-foreground">{$t('timetable.progressCloseHint')}</p>{/if}
	{/snippet}
</FormModal>

{#if defaultsOpen}
	<FormModal bind:open={defaultsOpen} title={$t('timetable.saveSchoolDefaults')} onSubmit={() => {}}>
		<TimetableSolverOptionsPanel {enforceWorkloadFulfillment} {excludeBreakSlots} {allowUnassignedTeacherPlacements} {useHomeroomTeacherFallback} {minDayGapSameSubject} {timetableMinPeriodSpan} {timetableMaxPeriodSpan} schoolId={academicContext.schools[0]?.id ?? ''} {schoolRaw} showSchoolDefaults onSaved={() => defaultsOpen = false} />
		{#snippet footer({ close })}<Button variant="ghost" onclick={close}>{$t('common.cancel')}</Button>{/snippet}
	</FormModal>
{/if}

<style>
 :global(.timetable-progress-body) { display:flex; flex-direction:column; }
 .generation-progress { margin:auto 0; width:100%; display:flex; flex-direction:column; align-items:center; gap:16px; padding:24px 0; text-align:center; }
 .generation-progress-bar { width:100%; max-width:320px; height:8px; border:0; border-radius:8px; overflow:hidden; accent-color:hsl(var(--primary)); background:hsl(var(--secondary)); }
 .generation-progress-bar::-webkit-progress-bar { background:hsl(var(--secondary)); border-radius:8px; }
 .generation-progress-bar:indeterminate { background:linear-gradient(90deg,hsl(var(--secondary)) 0%,hsl(var(--primary)) 50%,hsl(var(--secondary)) 100%); background-size:200% 100%; animation:generation-pulse 2s ease-in-out infinite; }
 .generation-progress-bar:indeterminate::-webkit-progress-bar { background:transparent; }
 @keyframes generation-pulse { from { background-position:100% 0; } to { background-position:-100% 0; } }
 @media(prefers-reduced-motion:reduce) { .generation-progress-bar:indeterminate { animation:none; } }

 .compact-impact { display:none; }
 @media(max-width:900px), (max-height:700px) {
  .setup-footer-summary { display:none; }
  .compact-impact { display:block; }
 }

 :global(.timetable-setup-body) { container-type:inline-size; }
 .timetable-setup { display:flex; flex-direction:column; gap:16px; min-height:0; }
 .timetable-setup-top { display:flex; flex-direction:column; gap:8px; }
 .timetable-setup-panel { min-width:0; }
 @container (min-width:768px) {
  @media(min-height:700px) {
   .timetable-setup { height:100%; }
   .timetable-setup-top { flex-shrink:0; }
   .timetable-setup-panel { flex:1; min-height:0; overflow:auto; }
  }
 }
</style>
