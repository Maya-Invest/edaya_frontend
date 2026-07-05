<script lang="ts">
	import type { AttendanceDay } from '$lib/types/school';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { locale, t } from '$lib/i18n';
	import { CalendarDays, ClipboardCheck } from '$lib/icons';
	import { cn } from '$lib/utils';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (day: AttendanceDay) => void;
		selectedId?: string;
	} = $props();

	const days = $derived(detailDataContext.attendanceDaysForClass(classId));
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('attendanceDay.eyebrow')}
		title={$t('attendanceDay.count', { n: days.length })}
	/>

	<div class="space-y-3">
		{#each days as day (day.id)}
			{@const active = selectedId === day.id}
			{@const progress = day.totalStudents
				? (day.recordedCount / day.totalStudents) * 100
				: 0}
			{@const isComplete = day.totalStudents > 0 && day.recordedCount === day.totalStudents}
			<button
				type="button"
				onclick={() => onSelect?.(day)}
				class={cn(
					'group grid w-full grid-cols-12 items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-panel',
					active && 'border-primary/40 bg-primary/5',
				)}
			>
				<div class="col-span-7">
					<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
						{$t('attendanceDay.dailyRollCall')}
					</p>
					<h3 class="mt-1 font-display text-lg font-semibold leading-tight">{day.label}</h3>
					<p class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
						<CalendarDays class="h-3 w-3" />
						{new Date(day.date).toLocaleDateString($locale, {
							weekday: 'long',
							day: 'numeric',
							month: 'short',
							year: 'numeric',
						})}
					</p>
				</div>
				<div class="col-span-5">
					<div class="flex items-center justify-between text-[11px] text-muted-foreground">
						<span class="inline-flex items-center gap-1">
							<ClipboardCheck class="h-3 w-3" />
							{$t('attendanceDay.recorded')}
						</span>
						<span class="font-mono">{day.recordedCount}/{day.totalStudents}</span>
					</div>
					<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
						<div
							class={cn('h-full rounded-full', isComplete ? 'bg-accent' : 'bg-highlight')}
							style:width="{progress}%"
						></div>
					</div>
				</div>
			</button>
		{/each}
		{#if days.length === 0}
			<p
				class="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
			>
				{$t('attendanceDay.none')}
			</p>
		{/if}
	</div>
</div>
