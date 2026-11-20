<script lang="ts">
	import type { PeriodDefinition } from '$lib/types/school';
	import { PERIOD_DEFINITION_WEEKDAY_LABEL_KEY } from '$lib/components/calendar/period-definition-presets';
	import WeeklyPeriodCalendar from '$lib/components/calendar/WeeklyPeriodCalendar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { eligiblePreferredPeriodIds, morningPeriodIds } from '$lib/scheduling/preferred-periods';

	let { periods, preferredIds = $bindable<string[]>([]) }: { periods: PeriodDefinition[]; preferredIds?: string[] } = $props();
	const eligible = $derived(periods.filter(p => !p.isBreak && p.isTeachingSlot));
	const groups = $derived(Object.keys(PERIOD_DEFINITION_WEEKDAY_LABEL_KEY).map(day => ({ dayOfWeek: day as PeriodDefinition['dayOfWeek'], defs: periods.filter(p => p.dayOfWeek === day) })));
	const removed = $derived(preferredIds.filter(id => !eligible.some(p => p.id === id)));
</script>
<section class="preferred-panel min-w-0 space-y-2">
	<h2 class="font-display text-xl font-semibold">{$t('timetable.preferredPeriods')}</h2>
	<p class="text-sm text-muted-foreground">{$t('timetable.preferredPeriodsHint')}</p>
	<div class="flex flex-wrap gap-2"><Button variant="outline" onclick={() => preferredIds = morningPeriodIds(periods)}>{$t('timetable.preferMornings')}</Button><Button variant="ghost" onclick={() => preferredIds = []}>{$t('timetable.noPreferredPeriods')}</Button></div>
	{#if removed.length}<p role="status">{$t('timetable.unavailablePreferences')}</p>{/if}
	<WeeklyPeriodCalendar {groups} mode="select" selectedIds={eligiblePreferredPeriodIds(periods, preferredIds)} onSelectionChange={ids => preferredIds = ids} />
</section>

<style>
 @container(min-width:768px) { @media(min-height:700px) { .preferred-panel { height:100%; display:flex; flex-direction:column; } } }
</style>
