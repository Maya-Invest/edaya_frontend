<script lang="ts">
	import type { PeriodDefinition } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import {
		buildPreferredPeriodWeekGrid,
		preferredPeriodDayLabelKey,
	} from '../lib/timetable-generation-ui';

	let {
		periods,
		preferredIds = $bindable<string[]>([]),
	}: {
		periods: PeriodDefinition[];
		preferredIds?: string[];
	} = $props();

	const weekGrid = $derived(buildPreferredPeriodWeekGrid(periods));
	const listPeriods = $derived(
		periods
			.filter(period => !period.isBreak && period.isTeachingSlot !== false)
			.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label)),
	);

	function togglePreferred(id: string) {
		preferredIds = preferredIds.includes(id)
			? preferredIds.filter(value => value !== id)
			: [...preferredIds, id];
	}
</script>

<section class="flex h-full min-h-0 flex-col overflow-hidden rounded-collection border border-border/70">
	<div class="shrink-0 border-b border-border/60 px-3 py-2">
		<p class="text-sm font-medium">{$t('timetable.preferredPeriods')}</p>
		<p class="text-xs text-muted-foreground">{$t('timetable.preferredPeriodsHint')}</p>
	</div>
	<div class="min-h-0 flex-1 overflow-auto p-2">
		{#if periods.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">{$t('timetable.noPeriodDefinitions')}</p>
		{:else if weekGrid}
			<div class="overflow-x-auto">
				<table class="ui-entry-table w-full min-w-[34rem] border-separate border-spacing-0 text-xs">
					<thead>
						<tr>
							<th
								class="sticky left-0 z-10 min-w-[7.5rem] border-b border-border/60 bg-card px-2 py-2 text-left font-medium text-muted-foreground"
							>
								{$t('timetable.periodSlot')}
							</th>
							{#each weekGrid.weekDays as day (day)}
								<th class="border-b border-border/60 px-1 py-2 text-center font-medium text-muted-foreground">
									{$t(preferredPeriodDayLabelKey(day))}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each weekGrid.entries as entry (entry.rowKey)}
							{#if entry.kind === 'break'}
								<tr>
									<td
										colspan={weekGrid.weekDays.length + 1}
										class="border-b border-border/40 bg-muted/25 px-2 py-1.5 text-center text-xs text-muted-foreground"
									>
										{entry.label} · {entry.startTime}–{entry.endTime}
									</td>
								</tr>
							{:else}
								<tr>
									<td class="sticky left-0 z-10 border-b border-border/40 bg-card px-2 py-2 align-middle">
										<p class="font-medium leading-tight text-foreground">{entry.label}</p>
										<p class="mt-0.5 font-sans tabular-nums text-xs text-muted-foreground">{entry.startTime}–{entry.endTime}</p>
									</td>
									{#each weekGrid.weekDays as day (day)}
										{@const cell = entry.cells[day]}
										<td class="border-b border-border/40 px-1 py-1.5 text-center align-middle">
											{#if cell}
												<Button variant="outline"
													type="button"
													aria-pressed={preferredIds.includes(cell.id)}
													aria-label={`${entry.label} · ${$t(preferredPeriodDayLabelKey(day))}`}
													class={cn(
														'mx-auto min-h-11 min-w-11 p-2',
														preferredIds.includes(cell.id)
															? 'border-primary bg-primary/15 text-primary'
															: 'border-border/50 bg-secondary/25 text-transparent hover:border-border hover:bg-secondary/60',
													)}
													onclick={() => togglePreferred(cell.id)}
												>
													<span aria-hidden="true" class={preferredIds.includes(cell.id) ? 'text-xs font-semibold' : ''}>✓</span>
												</Button>
											{:else}
												<span class="text-muted-foreground/40">—</span>
											{/if}
										</td>
									{/each}
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#each listPeriods as period (period.id)}
					<Button variant="outline"
						type="button"
						aria-pressed={preferredIds.includes(period.id)}
						class={cn(
							'flex h-auto min-h-11 flex-col items-start whitespace-normal p-4 text-left text-sm',
							preferredIds.includes(period.id)
								? 'border-primary bg-primary/10 text-primary'
								: 'border-border/50 bg-secondary/30 text-foreground hover:bg-secondary/60',
						)}
						onclick={() => togglePreferred(period.id)}
					>
						<span class="block font-medium">{period.label}</span>
						<span class="mt-0.5 block font-sans tabular-nums text-xs text-muted-foreground">{period.startTime}–{period.endTime}</span>
					</Button>
				{/each}
			</div>
		{/if}
	</div>
</section>
