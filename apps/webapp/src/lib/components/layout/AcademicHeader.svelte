<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import { t } from '$lib/i18n';
	import { Check, ChevronDown, CalendarRange } from '$lib/icons';
	import { cn } from '$lib/utils';
	let open = $state(false);
	const year = $derived(academicContext.year);
	const years = $derived(
		academicContext.publishedYears.length > 0
			? academicContext.publishedYears
			: academicContext.years,
	);
</script>
<div
	class="relative flex items-center gap-1.5 rounded-full border border-border bg-card/70 p-1 shadow-soft backdrop-blur"
>
	<CalendarRange class="ml-2 h-3.5 w-3.5 text-muted-foreground" />
	<div class="relative">
		<button
			type="button"
			onclick={() => (open = !open)}
			class={cn(
				'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
				open ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary',
			)}
		>
			<span>{year?.label ?? '—'}</span>
			<ChevronDown class={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
		</button>
		{#if open}
			<div
				class="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-panel animate-fade-in"
			>
				{#each years as y (y.id)}
					<button
						type="button"
						onclick={() => {
							academicContext.setYear(y.id);
							open = false;
						}}
						class={cn(
							'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/60',
							y.id === academicContext.yearId && 'bg-primary/5',
						)}
					>
						<span>{y.label}</span>
						{#if y.id === academicContext.yearId}<Check class="h-3.5 w-3.5 text-accent" />{/if}
					</button>
				{:else}
					<p class="px-4 py-3 text-sm text-muted-foreground">
						{$t('academic.noPublishedPeriods')}
					</p>
				{/each}
			</div>
		{/if}
	</div>
</div>
