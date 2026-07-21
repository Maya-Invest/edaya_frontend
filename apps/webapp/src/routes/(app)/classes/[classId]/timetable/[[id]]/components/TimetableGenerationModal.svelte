<script lang="ts">
	import type { TimetableGenerationOptions, TimetablePageState } from '../timetable-page.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { resolvedPeriodsPerWeekPlaceholder, setPeriodsPerWeekOverride } from '$lib/components/school/scheduling/timetable-placement-parameters';
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

	let startDate = $state('');
	let endDate = $state('');
	let advanced = $state(false);
	let enforceWorkloadFulfillment = $state<boolean | undefined>();
	let excludeBreakSlots = $state<boolean | undefined>();
	let allowUnassignedTeacherPlacements = $state<boolean | undefined>();
	let useHomeroomTeacherFallback = $state<boolean | undefined>();
	let minPeriodGapSameSubject = $state('');
	let preferredIds = $state<string[]>([]);
	let policy = $state<'fail' | 'skip'>('fail');
	let overrides = $state<Record<string, number>>({});

	const periods = $derived(academicContext.periodDefinitionsForYear(academicContext.yearId));
	const yearStart = $derived(formatDateInput(academicContext.year?.startDate));
	const yearEnd = $derived(formatDateInput(academicContext.year?.endDate));
	const validRange = $derived(Boolean(startDate && endDate && startDate <= endDate
		&& (!yearStart || startDate >= yearStart)
		&& (!yearEnd || endDate <= yearEnd)));

	$effect(() => {
		if (!open)
			return;
		const range = timetablePage.periodRange;
		startDate = range.startDate;
		endDate = range.endDate;
		policy = 'fail';
		advanced = false;
		overrides = {};
		const school = academicContext.schools[0];
		enforceWorkloadFulfillment = school?.timetableEnforceWorkloadFulfillment;
		excludeBreakSlots = school?.timetableExcludeBreakSlots;
		allowUnassignedTeacherPlacements = school?.timetableAllowUnassignedTeacherPlacements;
		useHomeroomTeacherFallback = school?.timetableUseHomeroomTeacherFallback;
		minPeriodGapSameSubject = school ? String(school.timetableMinPeriodGapSameSubject) : '';
		preferredIds = school?.timetablePreferredPeriodDefinitionIds ?? [];
		void timetablePage.loadTeacherConstraints();
		void timetablePage.resolveSpace(startDate, endDate);
	});

	function togglePreferred(id: string, checked: boolean) {
		preferredIds = checked ? [...preferredIds, id] : preferredIds.filter(value => value !== id);
	}

	function options(): TimetableGenerationOptions | undefined {
		if (!advanced)
			return undefined;
		const value: TimetableGenerationOptions = {};
		if (enforceWorkloadFulfillment !== undefined)
			value.enforceWorkloadFulfillment = enforceWorkloadFulfillment;
		if (excludeBreakSlots !== undefined)
			value.excludeBreakSlots = excludeBreakSlots;
		if (allowUnassignedTeacherPlacements !== undefined)
			value.allowUnassignedTeacherPlacements = allowUnassignedTeacherPlacements;
		if (useHomeroomTeacherFallback !== undefined)
			value.useHomeroomTeacherFallback = useHomeroomTeacherFallback;
		if (minPeriodGapSameSubject)
			value.minPeriodGapSameSubject = Number(minPeriodGapSameSubject);
		if (preferredIds.length)
			value.preferredPeriodDefinitionIds = preferredIds;
		return value;
	}

	function setOverride(id: string, value: string) {
		overrides = setPeriodsPerWeekOverride(overrides, id, value);
	}

	async function submit() {
		if (!validRange)
			return;
		const result = mode === 'republish'
			? await timetablePage.republish({ startDate, endDate, policy, options: options(), periodsPerWeekByClassSubjectId: overrides })
			: await timetablePage.generate({ startDate, endDate, options: options(), periodsPerWeekByClassSubjectId: overrides });
		if (result)
			open = false;
	}
</script>

<FormModal
	bind:open
	title={mode === 'republish' ? $t('timetable.republishTitle') : $t('timetable.generateTitle')}
	description={mode === 'republish' ? $t('timetable.republishHint') : $t('timetable.generateHint')}
	submitLabel={mode === 'republish' ? $t('timetable.republish') : $t('timetable.generateDraft')}
	busy={timetablePage.busy}
	submitDisabled={!validRange}
	onSubmit={submit}
>
	<div class="grid grid-cols-2 gap-3">
		<label class="space-y-1.5 text-sm"><span>{$t('common.startDate')}</span><Input type="date" bind:value={startDate} onchange={() => timetablePage.resolveSpace(startDate, endDate)} /></label>
		<label class="space-y-1.5 text-sm"><span>{$t('common.endDate')}</span><Input type="date" bind:value={endDate} onchange={() => timetablePage.resolveSpace(startDate, endDate)} /></label>
	</div>
	<p class="text-xs text-muted-foreground">{$t('timetable.teachingCells', { count: timetablePage.spaceCellCount })}</p>

	{#if mode === 'republish'}
		<label class="space-y-1.5 text-sm">
			<span>{$t('timetable.conflictPolicy')}</span>
			<select bind:value={policy} class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
				<option value="fail">{$t('timetable.policyFail')}</option>
				<option value="skip">{$t('timetable.policySkip')}</option>
			</select>
		</label>
	{/if}

	<Button type="button" variant="ghost" size="sm" class="px-0" onclick={() => (advanced = !advanced)}>
		{$t('timetable.advancedOptions')}
	</Button>
	{#if advanced}
		<div class="space-y-3 border-t border-border pt-3">
			<label class="flex items-center gap-2 text-sm"><Checkbox checked={enforceWorkloadFulfillment === true} onCheckedChange={value => (enforceWorkloadFulfillment = Boolean(value))} />{$t('timetable.enforceWorkload')}</label>
			<label class="flex items-center gap-2 text-sm"><Checkbox checked={excludeBreakSlots === true} onCheckedChange={value => (excludeBreakSlots = Boolean(value))} />{$t('timetable.excludeBreaks')}</label>
			<label class="flex items-start gap-2 text-sm"><Checkbox class="mt-0.5" checked={allowUnassignedTeacherPlacements === true} onCheckedChange={value => (allowUnassignedTeacherPlacements = Boolean(value))} /><span><span class="block">{$t('timetable.allowUnassignedTeachers')}</span><span class="block text-xs text-muted-foreground">{$t('timetable.allowUnassignedTeachersHint')}</span></span></label>
			<label class="flex items-start gap-2 text-sm"><Checkbox class="mt-0.5" checked={useHomeroomTeacherFallback === true} onCheckedChange={value => (useHomeroomTeacherFallback = Boolean(value))} /><span><span class="block">{$t('timetable.homeroomTeacherFallback')}</span><span class="block text-xs text-muted-foreground">{$t('timetable.homeroomTeacherFallbackHint')}</span></span></label>
			<label class="space-y-1.5 text-sm"><span>{$t('timetable.sameSubjectGap')}</span><Input type="number" min="0" bind:value={minPeriodGapSameSubject} /></label>
			<div>
				<p class="mb-2 text-sm">{$t('timetable.preferredPeriods')}</p>
				<div class="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto">
					{#each periods as period (period.id)}
						<label class="flex items-center gap-2 text-xs"><Checkbox checked={preferredIds.includes(period.id)} onCheckedChange={value => togglePreferred(period.id, Boolean(value))} />{period.label}</label>
					{/each}
				</div>
			</div>
			<div>
				<p class="mb-2 text-sm">{$t('timetable.workloadOverrides')}</p>
				<div class="max-h-40 overflow-y-auto border-y border-border/70">
					{#each timetablePage.classSubjects as subject (subject.id)}
						<label class="grid grid-cols-[1fr_5rem] items-center gap-2 border-b border-border/50 py-2 text-xs last:border-0">
							<span>{timetablePage.subjectLabels[subject.subjectId] ?? subject.subjectId}</span>
							<Input type="number" min="0" value={String(overrides[subject.id] ?? '')} placeholder={String(resolvedPeriodsPerWeekPlaceholder(subject))} oninput={event => setOverride(subject.id, event.currentTarget.value)} />
						</label>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</FormModal>
