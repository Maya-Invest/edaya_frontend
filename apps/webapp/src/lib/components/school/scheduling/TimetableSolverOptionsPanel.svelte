<script lang="ts">
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';

	let {
		generationMode = $bindable<'weekly' | 'free' | undefined>(),
		enforceWorkloadFulfillment = $bindable<boolean | undefined>(),
		excludeBreakSlots = $bindable<boolean | undefined>(),
		allowUnassignedTeacherPlacements = $bindable<boolean | undefined>(),
		useHomeroomTeacherFallback = $bindable<boolean | undefined>(),
		minDayGapSameSubject = $bindable(''),
		policy = $bindable<'fail' | 'skip'>('fail'),
		showRepublishPolicy = false,
	}: {
		generationMode?: 'weekly' | 'free' | undefined;
		enforceWorkloadFulfillment?: boolean | undefined;
		excludeBreakSlots?: boolean | undefined;
		allowUnassignedTeacherPlacements?: boolean | undefined;
		useHomeroomTeacherFallback?: boolean | undefined;
		minDayGapSameSubject?: string;
		policy?: 'fail' | 'skip';
		showRepublishPolicy?: boolean;
	} = $props();
</script>

<div class="space-y-4 rounded-xl border border-border/70 bg-muted/15 p-3">
	<div>
		<p class="text-sm font-medium">{$t('timetable.solverOptions')}</p>
		<p class="text-xs text-muted-foreground">{$t('timetable.solverOptionsHint')}</p>
	</div>

	<label class="space-y-1.5 text-sm">
		<span>{$t('timetable.generationMode')}</span>
		<p class="text-xs text-muted-foreground">{$t('timetable.generationModeHint')}</p>
		<select bind:value={generationMode} class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
			<option value="weekly">{$t('timetable.generationModeWeekly')}</option>
			<option value="free">{$t('timetable.generationModeFree')}</option>
		</select>
	</label>

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

	<label class="block space-y-1.5 text-sm">
		<span>{$t('timetable.sameSubjectDayGap')}</span>
		<p class="text-xs text-muted-foreground">{$t('timetable.sameSubjectDayGapHint')}</p>
		<Input type="number" min="0" bind:value={minDayGapSameSubject} />
	</label>
</div>
