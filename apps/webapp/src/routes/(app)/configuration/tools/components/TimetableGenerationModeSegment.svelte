<script lang="ts">
	import { t } from '$lib/i18n';

	let {
		generationMode = $bindable<'weekly' | 'free'>('weekly'),
	}: {
		generationMode?: 'weekly' | 'free';
	} = $props();

	const modes: { id: 'weekly' | 'free'; labelKey: string }[] = [
		{ id: 'weekly', labelKey: 'timetable.generationModeWeeklyShort' },
		{ id: 'free', labelKey: 'timetable.generationModeFreeShort' },
	];
</script>

<fieldset class="space-y-1">
	<legend class="text-sm">{$t('timetable.generationMode')}</legend>
	<div class="flex flex-wrap gap-x-4">
		{#each modes as mode (mode.id)}
			<label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="radio" name="timetable-generation-mode" value={mode.id} bind:group={generationMode} class="accent-primary" />{$t(mode.id === 'weekly' ? 'timetable.weeklyModeLabel' : 'timetable.generationModeFreeShort')}</label>
		{/each}
	</div>
	<p class="text-xs text-muted-foreground">{$t(generationMode === 'weekly' ? 'timetable.weeklyExplanation' : 'timetable.freeExplanation')}</p>
</fieldset>
