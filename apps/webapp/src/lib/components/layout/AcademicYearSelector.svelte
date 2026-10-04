<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { CalendarRange, Check, ChevronDown } from '$lib/icons';
	import { cn } from '$lib/utils';

	const { collapsed = false, onOpenChange }: { collapsed?: boolean; onOpenChange?: (open: boolean) => void } = $props();
	let open = $state(false);
	const years = $derived(academicContext.publishedYears.length > 0 ? academicContext.publishedYears : academicContext.years);
</script>

<div class={cn('mt-2', !collapsed && 'w-full')} data-testid="academic-year-selector">
	{#if !collapsed}<p class="mb-1 text-xs font-medium text-muted-foreground">{$t('academic.workspaceYear')}</p>{/if}
	<Popover.Popover bind:open {onOpenChange}>
		<Popover.PopoverTrigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline" class={cn('h-11 gap-2 rounded-xl text-xs', collapsed ? 'w-11 p-0' : 'w-full justify-between')} disabled={!academicContext.shellReady || years.length === 0} data-testid="academic-year-trigger" data-school-id={authSession.schoolId} data-year-id={academicContext.yearId} aria-label={`${$t('academic.selectYear')} · ${academicContext.year?.label ?? '—'}`} title={academicContext.year?.label}>
					<CalendarRange class="h-4 w-4 shrink-0" />
					{#if !collapsed}<span class="min-w-0 flex-1 text-left">{academicContext.year?.label ?? '—'}</span><ChevronDown class="h-3 w-3 shrink-0" />{/if}
				</Button>
			{/snippet}
		</Popover.PopoverTrigger>
		<Popover.PopoverContent class="max-h-72 w-56 overflow-y-auto p-1" align="start" side={collapsed ? 'right' : 'bottom'}>
			{#each years as year (year.id)}
				<button type="button" class={cn('control-focus flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary', year.id === academicContext.yearId && 'bg-primary/5')} aria-current={year.id === academicContext.yearId ? 'true' : undefined} onclick={() => {
					academicContext.setYear(year.id);
					open = false;
				}}>
					<span>{year.label}</span>
					{#if year.id === academicContext.yearId}<Check class="h-4 w-4 shrink-0 text-primary" />{/if}
				</button>
			{/each}
		</Popover.PopoverContent>
	</Popover.Popover>
</div>
