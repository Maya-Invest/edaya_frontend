<script lang="ts">
	import type { TimetableRangePreset } from '../lib/timetable-generation-ui';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { activeRangePresetId } from '../lib/timetable-generation-ui';
	import TimetableGenerationModeSegment from './TimetableGenerationModeSegment.svelte';

	let {
		startDate = $bindable(''),
		endDate = $bindable(''),
		presets,
		generationMode = $bindable<'weekly' | 'free'>('weekly'),
		showGenerationMode = false,
		validRange = true,
		onRangeChange,
	}: {
		startDate?: string;
		endDate?: string;
		presets: TimetableRangePreset[];
		generationMode?: 'weekly' | 'free';
		showGenerationMode?: boolean;
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

<div class="range-controls">
	<div class="space-y-1">
		<div class="grid grid-cols-2 gap-3">
			<label class="min-w-0 space-y-1 text-sm"><span>{$t('common.startDate')}</span><Input type="date" bind:value={startDate} onchange={notifyRangeChange} /></label>
			<label class="min-w-0 space-y-1 text-sm"><span>{$t('common.endDate')}</span><Input type="date" bind:value={endDate} onchange={notifyRangeChange} /></label>
		</div>
		<div class="flex flex-wrap gap-1">
			{#each presets as preset (preset.id)}
				<Button variant="ghost" type="button" aria-pressed={activePresetId === preset.id} class={activePresetId === preset.id ? 'bg-primary/10 text-primary' : ''} onclick={() => applyPreset(preset)}>{preset.id === 'full-year' ? $t('timetable.fullAcademicYear') : preset.label}</Button>
			{/each}
		</div>
	</div>
	{#if showGenerationMode}<TimetableGenerationModeSegment bind:generationMode />{/if}
</div>
{#if !validRange}<p role="alert" class="text-xs text-destructive">{$t('timetable.invalidRange')}</p>{/if}
<style>
 .range-controls { display:grid; gap:12px; }
 @container(min-width:768px) { .range-controls { grid-template-columns:minmax(0,1.3fr) minmax(0,1fr); gap:24px; } }
</style>
