<script lang="ts" generics="TRow extends { id: string }">
	import type { ListEntityCardLayout } from '$lib/list/list-entity-card-layout';
	import type { ListEntityTableRowContext } from '$lib/list/list-entity-table-types';
	import type { Snippet } from 'svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';

	const {
		layout,
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
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick?.();
		}
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={onClick}
	onkeydown={handleKeydown}
	class={cn(
		'rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-panel',
		active && 'border-primary/40 bg-primary/5',
		selectionMode && selected && 'border-primary/30 bg-primary/5',
		cardClass,
	)}
>
	<div class="mb-3 flex items-center justify-between gap-2">
		{#if selectionMode}
			<div role="presentation" onclick={event => event.stopPropagation()}>
				<Checkbox
					class="rounded-[2px]"
					checked={selected}
					onCheckedChange={checked => onToggleSelected?.(checked === true)}
					aria-label={$t('list.selectRow')}
				/>
			</div>
		{:else}
			<div></div>
		{/if}
		{#if showActions && actions}
			<div role="presentation" onclick={event => event.stopPropagation()}>
				{@render actions()}
			</div>
		{/if}
	</div>

	{#if layout === 'row'}
		<div class="flex items-center gap-4">
			{#if showHeader && header}
				<div class="min-w-0 shrink-0">
					{@render header(ctx)}
				</div>
			{/if}
			{#if showBody && body}
				<div class="min-w-0 flex-1">
					{@render body(ctx)}
				</div>
			{/if}
			{#if showFooter && footer}
				<div class="ml-auto shrink-0">
					{@render footer(ctx)}
				</div>
			{/if}
		</div>
	{:else if layout === 'split'}
		<div class="flex gap-4">
			{#if showHeader && header}
				<div class="shrink-0">
					{@render header(ctx)}
				</div>
			{/if}
			<div class="flex min-w-0 flex-1 flex-col gap-3">
				{#if showBody && body}
					<div>{@render body(ctx)}</div>
				{/if}
				{#if showFooter && footer}
					<div>{@render footer(ctx)}</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			{#if showHeader && header}
				<div>{@render header(ctx)}</div>
			{/if}
			{#if showBody && body}
				<div>{@render body(ctx)}</div>
			{/if}
			{#if showFooter && footer}
				<div>{@render footer(ctx)}</div>
			{/if}
		</div>
	{/if}
</div>
