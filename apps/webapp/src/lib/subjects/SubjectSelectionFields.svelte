<script lang="ts">
	import type { EnrollmentPeriod, SubjectSelection } from './subject-selection';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { isoToZonedDateAndTime } from '$lib/date/format';
	import { t } from '$lib/i18n';

	let { selection = $bindable<SubjectSelection>({ scope: 'annual' }), periods, zone, completedPeriodIds = [], onChange }: {
		selection: SubjectSelection;
		periods: EnrollmentPeriod[];
		zone: string;
		completedPeriodIds?: string[];
		onChange?: () => void;
	} = $props();
	const today = $derived(isoToZonedDateAndTime(new Date().toISOString(), zone).date);
	const selectedIds = $derived(selection.scope === 'periods' ? selection.periodIds : []);
	const visiblePeriods = $derived(periods.filter(period => String(period.endDate).slice(0, 10) >= today || selectedIds.includes(period.id) || completedPeriodIds.includes(period.id)).toSorted((a, b) => String(a.startDate).localeCompare(String(b.startDate))));
	function togglePeriod(id: string, checked: boolean) {
		const ids = checked ? [...selectedIds, id] : selectedIds.filter(value => value !== id);
		selection = ids.length ? { scope: 'periods', periodIds: ids } : { scope: 'none' };
		onChange?.();
	}
</script>

<div class="space-y-3">
	<label class="flex min-h-11 items-center gap-3 rounded-collection border p-3">
		<Checkbox checked={selection.scope === 'annual'} onCheckedChange={(checked) => {
			selection = { scope: checked ? 'annual' : 'none' };
			onChange?.();
		}} />
		<span class="font-medium">{$t('participation.annual')}</span>
	</label>
	{#if visiblePeriods.length}
		<p class="text-sm text-muted-foreground">{$t('participation.selectPeriods')}</p>
		{#each visiblePeriods as period (period.id)}
			{@const completed = String(period.endDate).slice(0, 10) < today}
			{#if completed}
				<p class="rounded-collection border p-3 text-sm text-muted-foreground">{period.name} · {$t('participation.completed')}</p>
			{:else}
				<label class="flex min-h-11 items-center gap-3 rounded-collection border p-3">
					<Checkbox checked={selectedIds.includes(period.id)} disabled={completed} onCheckedChange={checked => togglePeriod(period.id, checked)} />
					<span>{period.name}{#if completed}<span class="ml-2 text-xs text-muted-foreground">{$t('participation.completed')}</span>{/if}</span>
				</label>
			{/if}
		{/each}
	{/if}
	<Button size="sm" variant="ghost" onclick={() => {
		selection = { scope: 'none' };
		onChange?.();
	}}>{$t('participation.clearSelection')}</Button>
	<p class="text-sm text-muted-foreground">{$t(selection.scope === 'none' ? 'participation.withdrawExplanation' : 'participation.selectionExplanation')}</p>
</div>
