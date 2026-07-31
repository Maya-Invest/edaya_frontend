<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { dotByColor } from '$lib/components/school/shared/drawer-constants';
	import { ChevronRight } from '$lib/icons';
	import { cn } from '$lib/utils';

	const {
		subject,
		isLast = false,
		active = false,
		onSelect,
	}: {
		subject: Subject;
		isLast?: boolean;
		active?: boolean;
		onSelect?: () => void;
	} = $props();
</script>

<button
	type="button"
	onclick={() => onSelect?.()}
	class={cn(
		'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary',
		!isLast && 'border-b border-border',
		active && 'bg-primary/10',
	)}
>
	<div class={cn('h-8 w-1.5 shrink-0 rounded-full', dotByColor[subject.color])}></div>
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<span class="font-display text-sm font-semibold">{subject.name}</span>
			<span
				class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				{subject.category}
			</span>
		</div>
		<p class="mt-0.5 truncate text-xs text-muted-foreground">{subject.description}</p>
	</div>
	<div class="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
		<span class="font-mono tabular-nums">{subject.hoursPerWeek === null ? '—' : `${subject.hoursPerWeek}h`}</span>
		<ChevronRight class="h-4 w-4 text-muted-foreground" />
	</div>
</button>
