<script lang="ts">
	import type { TimetableRangePreset } from './timetable-generation-ui';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import { activeRangePresetId } from './timetable-generation-ui';
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

<div class="space-y-4">
	{#if presets.length > 0 || showGenerationMode}
		<div
			class={cn(
				'grid items-start gap-x-4 gap-y-2',
				presets.length > 0 && showGenerationMode && 'sm:grid-cols-[minmax(0,1fr)_auto]',
			)}
		>
			{#if presets.length > 0}
				<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{$t('timetable.rangePresets')}</p>
			{/if}
			{#if showGenerationMode}
				<p
					class={cn(
						'text-xs font-medium uppercase tracking-wide text-muted-foreground',
						presets.length > 0 && 'sm:justify-self-end',
					)}
				>
					{$t('timetable.generationMode')}
				</p>
			{/if}
			{#if presets.length > 0}
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
			{/if}
			{#if showGenerationMode}
				<div class={cn(presets.length > 0 && 'sm:justify-self-end')}>
					<TimetableGenerationModeSegment bind:generationMode />
				</div>
			{/if}
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
</div>
