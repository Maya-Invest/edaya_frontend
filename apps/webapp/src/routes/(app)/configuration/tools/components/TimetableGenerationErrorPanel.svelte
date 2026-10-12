<script lang="ts">
	import type { TimetableGenerationError } from '../lib/timetable-generation-errors';
	import { t } from '$lib/i18n';
	import { AlertCircle } from '$lib/icons';
	import { SURFACE_WARN } from '$lib/ui-tones';
	import { cn } from '$lib/utils';

	const {
		error,
		rangeLabel = '',
	}: {
		error: TimetableGenerationError;
		rangeLabel?: string;
	} = $props();
</script>

<section class="space-y-4" aria-live="polite">
	<div class={cn('rounded-xl border border-destructive/30 bg-destructive/5 p-4')}>
		<div class="flex items-start gap-3">
			<AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
			<div class="min-w-0 space-y-1">
				<p class="text-sm text-foreground">{error.summary}</p>
				{#if error.detail}
					<p class="text-sm font-medium text-foreground">
						{error.detail}
					</p>
				{/if}
				{#if rangeLabel}
					<p class="text-xs text-muted-foreground">{rangeLabel}</p>
				{/if}
			</div>
		</div>
	</div>

	{#if error.guidanceKeys.length > 0}
		<div class={cn(SURFACE_WARN, 'space-y-2')}>
			<p class="text-sm font-medium">{$t('timetable.errorGuidanceTitle')}</p>
			<ul class="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
				{#each error.guidanceKeys as guidanceKey (guidanceKey)}
					<li>{$t(guidanceKey)}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<p class="text-xs text-muted-foreground">{$t('timetable.errorDismissHint')}</p>
</section>
