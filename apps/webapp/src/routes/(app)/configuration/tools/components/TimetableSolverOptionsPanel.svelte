<script lang="ts">
	import type { SchoolRaw } from '$lib/api/school-data';

	import Button from '$lib/components/ui/button/button.svelte';

	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { getToolsPageState } from '../tools-page.svelte';

	const actionState = getToolsPageState();

	let {
		enforceWorkloadFulfillment = $bindable<boolean | undefined>(),
		excludeBreakSlots = $bindable<boolean | undefined>(),
		allowUnassignedTeacherPlacements = $bindable<boolean | undefined>(),
		useHomeroomTeacherFallback = $bindable<boolean | undefined>(),
		minDayGapSameSubject = $bindable(''),
		timetableMinPeriodSpan = $bindable(''),
		timetableMaxPeriodSpan = $bindable(''),
		schoolId = '',
		schoolRaw = $bindable<SchoolRaw | null>(null),
		policy = $bindable<'fail' | 'skip'>('fail'),
		showRepublishPolicy = false,
		showSchoolDefaults = false,
	}: {
		enforceWorkloadFulfillment?: boolean | undefined;
		excludeBreakSlots?: boolean | undefined;
		allowUnassignedTeacherPlacements?: boolean | undefined;
		useHomeroomTeacherFallback?: boolean | undefined;
		minDayGapSameSubject?: string;
		timetableMinPeriodSpan?: string;
		timetableMaxPeriodSpan?: string;
		schoolId?: string;
		schoolRaw?: SchoolRaw | null;
		policy?: 'fail' | 'skip';
		showRepublishPolicy?: boolean;
		showSchoolDefaults?: boolean;
	} = $props();

	let savingDefaults = $state(false);

	async function saveSchoolDefaults() {
		if (!schoolId || !schoolRaw) {
			return;
		}
		savingDefaults = true;
		try {
			const result = await actionState.performUpdateSchoolTimetableDefaults({
				schoolId,
				current: schoolRaw,
				successMessage: $t('timetable.schoolDefaultsSaved'),
				defaults: {
					schoolId,
					timetableEnforceWorkloadFulfillment: enforceWorkloadFulfillment === true,
					timetableExcludeBreakSlots: excludeBreakSlots === true,
					timetableAllowUnassignedTeacherPlacements: allowUnassignedTeacherPlacements === true,
					timetableUseHomeroomTeacherFallback: useHomeroomTeacherFallback === true,
					timetableMinDayGapSameSubject: Number(minDayGapSameSubject),
					timetableMinPeriodSpan: Number(timetableMinPeriodSpan),
					timetableMaxPeriodSpan: Number(timetableMaxPeriodSpan),
				},
			});
			if (result) {
				schoolRaw = result.raw;
				enforceWorkloadFulfillment = result.school.timetableEnforceWorkloadFulfillment;
				excludeBreakSlots = result.school.timetableExcludeBreakSlots;
				allowUnassignedTeacherPlacements = result.school.timetableAllowUnassignedTeacherPlacements;
				useHomeroomTeacherFallback = result.school.timetableUseHomeroomTeacherFallback;
				minDayGapSameSubject = String(result.school.timetableMinDayGapSameSubject);
				timetableMinPeriodSpan = String(result.school.timetableMinPeriodSpan);
				timetableMaxPeriodSpan = String(result.school.timetableMaxPeriodSpan);
			}
		}
		finally {
			savingDefaults = false;
		}
	}
</script>

<section class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/15">
	<div class="shrink-0 border-b border-border/60 px-3 py-2">
		<p class="text-sm font-medium">{$t('timetable.solverOptions')}</p>
		<p class="text-xs text-muted-foreground">{$t('timetable.solverOptionsHint')}</p>
	</div>

	<div class="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
		{#if showRepublishPolicy}
			<label class="space-y-1.5 text-sm">
				<span>{$t('timetable.conflictPolicy')}</span>
				<select bind:value={policy} class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
					<option value="fail">{$t('timetable.policyFail')}</option>
					<option value="skip">{$t('timetable.policySkip')}</option>
				</select>
			</label>
			<p class="text-xs text-muted-foreground">
				{policy === 'skip' ? $t('timetable.skipHint') : $t('timetable.failHint')}
			</p>
		{/if}

		<div class="space-y-2.5">
			<label class="flex items-center gap-2 text-sm"><Checkbox checked={enforceWorkloadFulfillment === true} onCheckedChange={value => (enforceWorkloadFulfillment = Boolean(value))} />{$t('timetable.enforceWorkload')}</label>
			<label class="flex items-center gap-2 text-sm"><Checkbox checked={excludeBreakSlots === true} onCheckedChange={value => (excludeBreakSlots = Boolean(value))} />{$t('timetable.excludeBreaks')}</label>
			<label class="flex items-start gap-2 text-sm"><Checkbox class="mt-0.5" checked={allowUnassignedTeacherPlacements === true} onCheckedChange={value => (allowUnassignedTeacherPlacements = Boolean(value))} /><span><span class="block">{$t('timetable.allowUnassignedTeachers')}</span><span class="block text-xs text-muted-foreground">{$t('timetable.allowUnassignedTeachersHint')}</span></span></label>
			<label class="flex items-start gap-2 text-sm"><Checkbox class="mt-0.5" checked={useHomeroomTeacherFallback === true} onCheckedChange={value => (useHomeroomTeacherFallback = Boolean(value))} /><span><span class="block">{$t('timetable.homeroomTeacherFallback')}</span><span class="block text-xs text-muted-foreground">{$t('timetable.homeroomTeacherFallbackHint')}</span></span></label>
		</div>

		{#if showSchoolDefaults}
			<div class="flex items-start justify-between gap-3 text-sm">
				<div class="min-w-0 flex-1 space-y-1.5">
					<span>{$t('timetable.sameSubjectDayGap')}</span>
					<p class="text-xs text-muted-foreground">{$t('timetable.sameSubjectDayGapHint')}</p>
				</div>
				<label class="flex shrink-0 flex-col items-center gap-0.5">
					<span class="text-[10px] leading-none text-muted-foreground">{$t('timetable.schoolDefaultDaysShort')}</span>
					<Input
						type="number"
						min="0"
						class="h-8 w-12 px-1 text-center text-sm"
						bind:value={minDayGapSameSubject}
					/>
				</label>
			</div>

			<div class="flex items-start justify-between gap-3 text-sm">
				<div class="min-w-0 flex-1 space-y-1.5">
					<span>{$t('timetable.periodsPerSessionRange')}</span>
					<p class="text-xs text-muted-foreground">{$t('timetable.periodsPerSessionRangeHint')}</p>
				</div>
				<div class="flex shrink-0 items-start gap-1.5">
					<label class="flex flex-col items-center gap-0.5">
						<span class="text-[10px] leading-none text-muted-foreground">{$t('timetable.minPeriodSpanShort')}</span>
						<Input
							type="number"
							min="1"
							class="h-8 w-12 px-1 text-center text-sm"
							bind:value={timetableMinPeriodSpan}
						/>
					</label>
					<label class="flex flex-col items-center gap-0.5">
						<span class="text-[10px] leading-none text-muted-foreground">{$t('timetable.maxPeriodSpanShort')}</span>
						<Input
							type="number"
							min="1"
							class="h-8 w-12 px-1 text-center text-sm"
							bind:value={timetableMaxPeriodSpan}
						/>
					</label>
				</div>
			</div>

			<Button
				variant="outline"
				size="sm"
				class="rounded-full"
				disabled={savingDefaults || !schoolId}
				onclick={saveSchoolDefaults}
			>
				{$t('timetable.saveSchoolDefaults')}
			</Button>
		{/if}
	</div>
</section>
