<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import { t } from '$lib/i18n';
	import { Check, ChevronDown, CalendarRange } from '$lib/icons';
	import { cn } from '$lib/utils';

	let open = $state<'year' | 'period' | null>(null);
	const year = $derived(academicContext.year);
	const period = $derived(academicContext.period);
	const years = $derived(
		academicContext.publishedYears.length > 0
			? academicContext.publishedYears
			: academicContext.years,
	);
	const periods = $derived(
		academicContext.publishedPeriodsForYear.length > 0
			? academicContext.publishedPeriodsForYear
			: academicContext.periodsForYear,
	);
</script>
<div
	class="relative flex items-center gap-1.5 rounded-full border border-border bg-card/70 p-1 shadow-soft backdrop-blur"
>
	<CalendarRange class="ml-2 h-3.5 w-3.5 text-muted-foreground" />
	<div class="relative">
		<button
			type="button"
			data-testid="academic-year-trigger"
			aria-label={$t('academic.selectYear')}
			aria-expanded={open === 'year'}
			onclick={() => (open = open === 'year' ? null : 'year')}
			class={cn(
				'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
				open === 'year' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary',
			)}
		>
			<span>{year?.label ?? '—'}</span>
			<ChevronDown class={cn('h-3 w-3 transition-transform', open === 'year' && 'rotate-180')} />
		</button>
		{#if open === 'year'}
			<div
				class="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-panel animate-fade-in"
			>
				{#each years as y (y.id)}
					<button
						type="button"
						onclick={() => {
							academicContext.setYear(y.id);
							open = null;
						}}
						class={cn(
							'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/60',
							y.id === academicContext.yearId && 'bg-primary/5',
						)}
					>
						<span>{y.label}</span>
						{#if y.id === academicContext.yearId}<Check class="h-3.5 w-3.5 text-accent" />{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
	<span class="text-muted-foreground/40">·</span>
	<div class="relative">
		<button
			type="button"
			data-testid="academic-period-trigger"
			aria-label={$t('academic.selectPeriod')}
			aria-expanded={open === 'period'}
			onclick={() => (open = open === 'period' ? null : 'period')}
			class={cn(
				'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
				open === 'period' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary',
			)}
		>
			<span>{period?.label ?? '—'}</span>
			<span
				class={cn(
					'font-sans tabular-nums text-[10px]',
					open === 'period' ? 'text-primary-foreground/70' : 'text-muted-foreground',
				)}
			>
				{period?.range ?? ''}
			</span>
			<ChevronDown class={cn('h-3 w-3 transition-transform', open === 'period' && 'rotate-180')} />
		</button>
		{#if open === 'period'}
			<div
				class="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-panel animate-fade-in"
			>
				{#each periods as p (p.id)}
					<button
						type="button"
						onclick={() => {
							academicContext.setPeriod(p.id);
							open = null;
						}}
						class={cn(
							'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/60',
							p.id === academicContext.periodId && 'bg-primary/5',
						)}
					>
						<span>
							<span class="font-medium">{p.label}</span>
							<span class="ml-2 font-sans tabular-nums text-[10px] text-muted-foreground">{p.range}</span>
						</span>
						{#if p.id === academicContext.periodId}<Check class="h-3.5 w-3.5 text-accent" />{/if}
					</button>
				{:else}
					<p class="px-4 py-3 text-sm text-muted-foreground">
						{academicContext.periods.length === 0
							? $t('academic.noPublishedPeriods')
							: $t('academic.noPeriodsForYear')}
					</p>
				{/each}
			</div>
		{/if}
	</div>
</div>
