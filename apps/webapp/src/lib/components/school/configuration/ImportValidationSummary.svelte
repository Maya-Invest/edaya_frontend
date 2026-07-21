<script lang="ts">
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';

	const {
		readyCount,
		errorCount,
		warningCount,
		readyLabelKey,
		errorLabelKey,
		warningLabelKey,
	}: {
		readyCount: number;
		errorCount: number;
		warningCount: number;
		readyLabelKey: string;
		errorLabelKey: string;
		warningLabelKey: string;
	} = $props();
</script>

<div class="grid gap-2 sm:grid-cols-3">
	<p
		class={cn(
			'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100',
			readyCount === 0 && 'opacity-60',
		)}
	>
		{$t(readyLabelKey, { n: readyCount })}
	</p>
	<p
		class={cn(
			'rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
			errorCount === 0 && 'opacity-60',
		)}
	>
		{$t(errorLabelKey, { n: errorCount })}
	</p>
	<p
		class={cn(
			'rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100',
			warningCount === 0 && 'opacity-60',
		)}
	>
		{$t(warningLabelKey, { n: warningCount })}
	</p>
</div>
