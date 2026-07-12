<script lang="ts">
	import type { PublishResult } from '$lib/api/mutations/timetable-generation.mutations';
	import { t } from '$lib/i18n';
	import { CheckCircle2 } from '$lib/icons';
	import { SURFACE_INFO, SURFACE_WARN } from '$lib/ui-tones';
	import { cn } from '$lib/utils';
	import { summarizePublish } from './timetable-generation-ui';

	const {
		result,
		className = '',
		rangeLabel = '',
	}: {
		result: PublishResult;
		className?: string;
		rangeLabel?: string;
	} = $props();

	const summary = $derived(summarizePublish(result));
</script>

<section class="space-y-4" aria-live="polite">
	<div class="rounded-xl border border-accent/40 bg-accent/5 p-4">
		<div class="flex items-start gap-3">
			<CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-accent" />
			<div class="space-y-1">
				<p class="font-medium text-foreground">{$t('timetable.publishSuccessTitle')}</p>
				<p class="text-sm text-muted-foreground">
					{className
						? $t('timetable.publishSuccessDescription', {
							published: summary.publishedCount,
							skipped: summary.skippedCount,
							className,
						})
						: $t('timetable.publishSuccessDescriptionShort', {
							published: summary.publishedCount,
							skipped: summary.skippedCount,
						})}
				</p>
				{#if rangeLabel}
					<p class="text-xs text-muted-foreground">{rangeLabel}</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-2">
		<div class={SURFACE_INFO}>
			<p class="text-xs text-muted-foreground">{$t('timetable.published')}</p>
			<p class="text-lg font-semibold">{summary.publishedCount}</p>
		</div>
		<div class={cn(SURFACE_INFO, summary.skippedCount > 0 && SURFACE_WARN)}>
			<p class="text-xs text-muted-foreground">{$t('timetable.skippedConflicts')}</p>
			<p class="text-lg font-semibold">{summary.skippedCount}</p>
		</div>
	</div>

	<p class="text-xs text-muted-foreground">{$t('timetable.resultDismissHint')}</p>
</section>
