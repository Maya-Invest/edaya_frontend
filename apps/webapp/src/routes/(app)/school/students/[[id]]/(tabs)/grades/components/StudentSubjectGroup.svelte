<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { components } from '$lib/api/schema';
	import { fmtDateFr } from '$lib/components/school/shared/drawer-constants';
	import Button from '$lib/components/ui/button/button.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { ChevronDown } from '$lib/icons';
	import { cn } from '$lib/utils';

	const {
		subject,
		items,
		subjectAvg,
		open = false,
		onOpenChange,
		total,
		graded,
		canLoadMore,
		loadingMore,
		loadError,
		onMore,
	}: {
		subject: string;
		items: components['schemas']['StudentGradeHistoryPage']['items'];
		total: number;
		graded: number;
		canLoadMore: boolean;
		loadingMore: boolean;
		loadError: boolean;
		onMore: () => void;
		subjectAvg: number | null;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	const collapsible = $derived(total > 1 || items.length === 0);
	const shown = $derived(collapsible ? open : true);
</script>

<div class="overflow-hidden rounded-collection border border-border bg-card">
	<button
		type="button"
		onclick={() => collapsible && onOpenChange?.(!open)}
		class={cn(
			'flex w-full items-center justify-between border-b border-border bg-secondary/40 px-3 py-2 text-left',
			collapsible ? 'cursor-pointer hover:bg-secondary/60' : 'cursor-default',
			!shown && 'border-b-0',
		)}
	>
		<div class="flex items-center gap-2">
			{#if collapsible}
				<ChevronDown class={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', !shown && '-rotate-90')} />
			{/if}
			<span class="text-sm font-semibold">{subject}</span>
			<span class="text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('student.historyGradeCount', { total, graded })}
			</span>
		</div>
		<p class="font-sans text-lg tabular-nums">
			{subjectAvg !== null ? subjectAvg.toFixed(1) : '-'}
			<span class="ml-0.5 text-xs font-normal text-muted-foreground">/20</span>
		</p>
	</button>
	{#if shown}
		<div class="divide-y divide-border">
			{#each items as e (e.id)}
				<div class="px-3 py-2">
					<div class="flex items-center justify-between gap-2">
						<a href={detailHref.classEvaluation(e.classGroupId, e.assessmentId) as ResolvedPathname} class="text-sm font-medium text-primary hover:underline">{e.title}</a>
						<p class="font-sans tabular-nums text-sm tabular-nums">
							{e.score !== null ? e.score.toFixed(1) : '-'}
							<span class="ml-0.5 text-xs text-muted-foreground">/{e.outOf}</span>
						</p>
					</div>
					<p class="mt-0.5 font-sans tabular-nums text-[10px] text-muted-foreground">
						{fmtDateFr(e.date, $locale)} - x{e.coefficient}
					</p>
				</div>
			{/each}
			{#if canLoadMore}
				{#if loadError}<p role="alert">{$t('dataState.errorDefault')}</p>{/if}
				<Button variant="outline" size="sm" disabled={loadingMore} onclick={onMore}>
					{$t(loadError ? 'dataState.retry' : 'student.olderGrades')}
				</Button>
			{/if}
		</div>
	{/if}
</div>
