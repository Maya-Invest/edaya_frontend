<script lang="ts">
	import type { TimetableRangePreset } from './timetable-generation-ui';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { CalendarRange } from '$lib/icons';
	import { SURFACE_INFO } from '$lib/ui-tones';
	import { cn } from '$lib/utils';
	import { activeRangePresetId } from './timetable-generation-ui';

	let {
		startDate = $bindable(''),
		endDate = $bindable(''),
		presets,
		spaceCellCount = 0,
		validRange = true,
		onRangeChange,
	}: {
		startDate?: string;
		endDate?: string;
		presets: TimetableRangePreset[];
		spaceCellCount?: number;
		validRange?: boolean;
		onRangeChange?: (startDate: string, endDate: string) => void;
	} = $props();

	const activePresetId = $derived(activeRangePresetId(presets, startDate, endDate));

	function applyPreset(preset: TimetableRangePreset) {
		startDate = preset.startDate;
		endDate = preset.endDate;
		onRangeChange?.(preset.startDate, preset.endDate);
	}

	function notifyRangeChange() {
		onRangeChange?.(startDate, endDate);
	}
</script>

<div class="space-y-4">
	{#if presets.length > 0}
		<div class="space-y-2">
			<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{$t('timetable.rangePresets')}</p>
			<div class="flex flex-wrap gap-2">
				{#each presets as preset (preset.id)}
					<button
						type="button"
						class={cn(
							'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
							activePresetId === preset.id
								? 'border-primary bg-primary/10 text-primary'
								: 'border-border bg-background text-foreground/80 hover:bg-secondary',
						)}
						onclick={() => applyPreset(preset)}
					>
						{preset.id === 'full-year' ? $t('timetable.fullAcademicYear') : preset.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="grid gap-3 sm:grid-cols-2">
		<label class="space-y-1.5 text-sm">
			<span>{$t('common.startDate')}</span>
			<Input type="date" bind:value={startDate} onchange={notifyRangeChange} />
		</label>
		<label class="space-y-1.5 text-sm">
			<span>{$t('common.endDate')}</span>
			<Input type="date" bind:value={endDate} onchange={notifyRangeChange} />
		</label>
	</div>

	{#if !validRange}
		<p class="text-xs text-destructive">{$t('timetable.invalidRange')}</p>
	{/if}

	<div class={SURFACE_INFO}>
		<div class="flex items-start gap-2 text-sm">
			<CalendarRange class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
			<div>
				<p class="font-medium text-foreground">{$t('timetable.teachingCells', { count: spaceCellCount })}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">{$t('timetable.teachingCellsHint')}</p>
			</div>
		</div>
	</div>
</div>
