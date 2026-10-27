<script lang="ts">
	import type { ListEntityCardLayout } from '$lib/list/list-entity-card-layout';
	import type { ListEntityTableRowContext } from '$lib/list/list-entity-table-types';
	import type { Snippet } from 'svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { t } from '$lib/i18n';
	import { ChevronRight } from '$lib/icons';
	import { cn } from '$lib/utils';

	const {
		selectionMode = false,
		selected = false,
		active = false,
		showHeader = false,
		showBody = false,
		showFooter = false,
		showActions = false,
		onToggleSelected,
		onClick,
		cardClass,
		header,
		body,
		footer,
		actions,
	}: {
		layout: ListEntityCardLayout;
		selectionMode?: boolean;
		selected?: boolean;
		active?: boolean;
		showHeader?: boolean;
		showBody?: boolean;
		showFooter?: boolean;
		showActions?: boolean;
		onToggleSelected?: (checked: boolean) => void;
		onClick?: () => void;
		cardClass?: string | false | undefined;
		header?: Snippet<[ListEntityTableRowContext]>;
		body?: Snippet<[ListEntityTableRowContext]>;
		footer?: Snippet<[ListEntityTableRowContext]>;
		actions?: Snippet;
	} = $props();

	const ctx = $derived({ selectionMode, selected, active } satisfies ListEntityTableRowContext);

	function handleKeydown(event: KeyboardEvent) {
		if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			onClick?.();
		}
	}
</script>

<div data-open-record={active} data-bulk-selected={selectionMode && selected} class={cn('ui-collection-row relative flex items-center gap-2 p-4 text-left', cardClass)}>
	{#if selectionMode}
		<div class="flex min-h-11 min-w-11 items-center justify-center">
			<Checkbox checked={selected} onCheckedChange={checked => onToggleSelected?.(checked === true)} aria-label={$t('list.selectRow')} />
		</div>
	{/if}
	<!-- Only navigable records receive the button role and tab stop. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		aria-current={active && onClick ? 'true' : undefined}
		role={onClick ? 'button' : 'presentation'}
		tabindex={onClick ? 0 : undefined}
		onclick={(event) => {
			if (event.target instanceof Element && event.target.closest('a, button, input, [role="checkbox"]'))
				return;
			onClick?.();
		}}
		onkeydown={handleKeydown}
		class={cn('control-focus flex min-w-0 flex-1 items-center gap-4 min-h-11', onClick && 'cursor-pointer')}
	>
		<div class="flex min-w-0 flex-1 flex-wrap items-center gap-4">
			{#if showHeader && header}<div class="min-w-0 text-sm font-semibold">{@render header(ctx)}</div>{/if}
			{#if showBody && body}<div class="min-w-0 flex-1 text-sm">{@render body(ctx)}</div>{/if}
			{#if showFooter && footer}<div class="min-w-0 text-xs">{@render footer(ctx)}</div>{/if}
		</div>
		{#if onClick}<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />{/if}
	</div>
	{#if showActions && actions}<div class="shrink-0">{@render actions()}</div>{/if}
</div>
