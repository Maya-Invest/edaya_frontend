<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
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
		<Button variant="outline"
			type="button"
			aria-pressed={generationMode === mode.id}
			class={cn(
				'text-sm',
				generationMode === mode.id
					? 'border-primary bg-primary/10 text-primary'
					: 'border-border bg-background text-foreground/80 hover:bg-secondary',
			)}
			onclick={() => (generationMode = mode.id)}
		>
			{$t(mode.labelKey)}
		</Button>
	{/each}
</div>
