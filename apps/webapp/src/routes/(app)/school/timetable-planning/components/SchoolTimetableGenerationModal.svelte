<script lang="ts">
	import type { TimetableGenerationOptions, TimetablePlanningPageState } from '../timetable-planning-page.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { formatDateInput } from '$lib/date/format';
	import { t } from '$lib/i18n';

	let { open = $bindable(false), state: planningPage }: { open?: boolean; state: TimetablePlanningPageState } = $props();
	let startDate = $state('');
	let endDate = $state('');
	let advanced = $state(false);
	let search = $state('');
	let enforceWorkloadFulfillment = $state<boolean | undefined>();
	let excludeBreakSlots = $state<boolean | undefined>();
	let allowUnassignedTeacherPlacements = $state<boolean | undefined>();
	let useHomeroomTeacherFallback = $state<boolean | undefined>();
	let minPeriodGapSameSubject = $state('');
	let overrides = $state<Record<string, number>>({});

	const yearStart = $derived(formatDateInput(academicContext.year?.startDate));
	const yearEnd = $derived(formatDateInput(academicContext.year?.endDate));
	const validRange = $derived(Boolean(startDate && endDate && startDate <= endDate
		&& (!yearStart || startDate >= yearStart)
		&& (!yearEnd || endDate <= yearEnd)));
	const filteredClasses = $derived(planningPage.classes.filter(row => row.name.toLowerCase().includes(search.toLowerCase())));

	$effect(() => {
		if (!open) {
			return;
		}
		({ startDate, endDate } = planningPage.range);
		advanced = false;
		search = '';
		overrides = {};
		const school = academicContext.schools[0];
		enforceWorkloadFulfillment = school?.timetableEnforceWorkloadFulfillment;
		excludeBreakSlots = school?.timetableExcludeBreakSlots;
		allowUnassignedTeacherPlacements = school?.timetableAllowUnassignedTeacherPlacements;
		useHomeroomTeacherFallback = school?.timetableUseHomeroomTeacherFallback;
		minPeriodGapSameSubject = school ? String(school.timetableMinPeriodGapSameSubject) : '';
	});

	function options(): TimetableGenerationOptions | undefined {
		if (!advanced) {
			return undefined;
		}
		const value: TimetableGenerationOptions = {};
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
		if (minPeriodGapSameSubject) {
			value.minPeriodGapSameSubject = Number(minPeriodGapSameSubject);
		}
		return value;
	}

	function setOverride(id: string, value: string) {
		const next = { ...overrides };
		if (value === '') {
			delete next[id];
		}
		else {
			next[id] = Number(value);
		}
		overrides = next;
	}

	async function submit() {
		if (!validRange) {
			return;
		}
		const result = await planningPage.generate({
			startDate,
			endDate,
			options: options(),
			periodsPerWeekByClassSubjectId: Object.keys(overrides).length ? overrides : undefined,
		});
		if (result) {
			open = false;
		}
	}
</script>

<FormModal bind:open title={$t('timetable.schoolGenerateTitle')} description={$t('timetable.schoolGenerateHint')} submitLabel={$t('timetable.generateSchool')} busy={planningPage.busy} submitDisabled={!validRange} onSubmit={submit}>
	<div class="grid gap-3 sm:grid-cols-2">
		<label class="space-y-1.5 text-sm"><span>{$t('common.startDate')}</span><Input type="date" bind:value={startDate} /></label>
		<label class="space-y-1.5 text-sm"><span>{$t('common.endDate')}</span><Input type="date" bind:value={endDate} /></label>
	</div>
	<Button type="button" variant="ghost" size="sm" class="px-0" onclick={() => (advanced = !advanced)}>{$t('timetable.advancedOptions')}</Button>
	{#if advanced}
		<div class="space-y-3 border-t border-border pt-3">
			<label class="flex items-center gap-2 text-sm"><Checkbox checked={enforceWorkloadFulfillment === true} onCheckedChange={value => (enforceWorkloadFulfillment = Boolean(value))} />{$t('timetable.enforceWorkload')}</label>
			<label class="flex items-center gap-2 text-sm"><Checkbox checked={excludeBreakSlots === true} onCheckedChange={value => (excludeBreakSlots = Boolean(value))} />{$t('timetable.excludeBreaks')}</label>
			<label class="flex items-start gap-2 text-sm"><Checkbox class="mt-0.5" checked={allowUnassignedTeacherPlacements === true} onCheckedChange={value => (allowUnassignedTeacherPlacements = Boolean(value))} /><span><span class="block">{$t('timetable.allowUnassignedTeachers')}</span><span class="block text-xs text-muted-foreground">{$t('timetable.allowUnassignedTeachersHint')}</span></span></label>
			<label class="flex items-start gap-2 text-sm"><Checkbox class="mt-0.5" checked={useHomeroomTeacherFallback === true} onCheckedChange={value => (useHomeroomTeacherFallback = Boolean(value))} /><span><span class="block">{$t('timetable.homeroomTeacherFallback')}</span><span class="block text-xs text-muted-foreground">{$t('timetable.homeroomTeacherFallbackHint')}</span></span></label>
			<label class="block space-y-1.5 text-sm"><span>{$t('timetable.sameSubjectGap')}</span><Input type="number" min="0" bind:value={minPeriodGapSameSubject} /></label>
			<div class="space-y-2">
				<Input bind:value={search} placeholder={$t('timetable.searchClasses')} />
				<div class="max-h-48 overflow-y-auto border-y border-border/70">
					{#each filteredClasses as classGroup (classGroup.id)}
						<div class="border-b border-border/50 py-2 last:border-0">
							<p class="text-xs font-semibold">{classGroup.name}</p>
							{#each planningPage.classSubjects.filter(subject => subject.classGroupId === classGroup.id) as subject (subject.id)}
								<label class="mt-1 grid grid-cols-[1fr_5rem] items-center gap-2 text-xs">
									<span>{planningPage.subjectLabels[subject.subjectId] ?? subject.subjectId}</span>
									<Input type="number" min="0" value={String(overrides[subject.id] ?? '')} placeholder={String(subject.periodsPerWeek ?? '')} oninput={event => setOverride(subject.id, event.currentTarget.value)} />
								</label>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</FormModal>
