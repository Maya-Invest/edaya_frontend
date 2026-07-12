<script lang="ts">
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';

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

<div class="flex flex-wrap gap-2" role="group" aria-label={$t('timetable.generationMode')}>
	{#each modes as mode (mode.id)}
		<button
			type="button"
			aria-pressed={generationMode === mode.id}
			class={cn(
				'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
				generationMode === mode.id
					? 'border-primary bg-primary/10 text-primary'
					: 'border-border bg-background text-foreground/80 hover:bg-secondary',
			)}
			onclick={() => (generationMode = mode.id)}
		>
			{$t(mode.labelKey)}
		</button>
	{/each}
</div>
