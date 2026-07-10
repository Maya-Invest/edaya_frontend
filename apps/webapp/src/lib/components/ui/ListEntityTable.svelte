<script lang="ts" generics="TRow extends { id: string }">
	import type { Snippet } from 'svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import { t } from '$lib/i18n';
	import { ChevronDown, ChevronUp } from '$lib/icons';
	import type { ListEntityTableColumn, ListEntityTableRowContext } from '$lib/list/list-entity-table-types';
	import { listSortButtonLabel } from '$lib/list/list-sort-label';
	import { cn } from '$lib/utils';

	const {
		columns,
		rows,
		highlightId,
		sort,
		onSort,
		selectionMode = false,
		selectedIds = [],
		onToggleSelected,
		onToggleAllVisible,
		allVisibleSelected = false,
		loading = false,
		loadingMore = false,
		hasMore = false,
		total = 0,
		visibleCount = 0,
		onLoadMore,
		rowClass,
		onRowClick,
		row,
		trailingHeader,
		emptyLabel,
		rowPaddingClass = 'py-3.5',
	}: {
		columns: ListEntityTableColumn[];
		rows: readonly TRow[];
		highlightId?: string;
		sort?: { column: string; dir: 'asc' | 'desc' | string };
		onSort?: (column: string) => void;
		selectionMode?: boolean;
		selectedIds?: readonly string[];
		onToggleSelected?: (id: string, checked: boolean) => void;
		onToggleAllVisible?: (checked: boolean) => void;
		allVisibleSelected?: boolean;
		loading?: boolean;
		loadingMore?: boolean;
		hasMore?: boolean;
		total?: number;
		visibleCount?: number;
		onLoadMore?: () => void;
		rowClass?: (row: TRow, ctx: ListEntityTableRowContext) => string | false | undefined;
		onRowClick?: (row: TRow) => void;
		row: Snippet<[TRow, ListEntityTableRowContext]>;
		trailingHeader?: Snippet;
		emptyLabel?: string;
		rowPaddingClass?: string;
	} = $props();

	const selectedSet = $derived(new Set(selectedIds));
	const resolvedEmptyLabel = $derived(emptyLabel ?? $t('students.noMatch'));

	const colSpanClass: Record<number, string> = {
		1: 'col-span-1',
		2: 'col-span-2',
		3: 'col-span-3',
		4: 'col-span-4',
		5: 'col-span-5',
		6: 'col-span-6',
		7: 'col-span-7',
		8: 'col-span-8',
		9: 'col-span-9',
		10: 'col-span-10',
		11: 'col-span-11',
		12: 'col-span-12',
	};

	function columnSpan(column: ListEntityTableColumn) {
		if (selectionMode && column.spanInSelectionMode !== undefined) {
			return column.spanInSelectionMode;
		}
		return column.span;
	}

	function handleRowClick(rowItem: TRow) {
		onRowClick?.(rowItem);
	}

	function handleRowKeydown(event: KeyboardEvent, rowItem: TRow) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onRowClick?.(rowItem);
		}
	}
</script>

<div
	class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
	aria-busy={loading}
>
	<div
		class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
	>
		{#if selectionMode}
			<div class="col-span-1 flex items-center">
				<div role="presentation" onclick={event => event.stopPropagation()}>
					<Checkbox
						class="rounded-[2px]"
						checked={allVisibleSelected}
						onCheckedChange={checked => onToggleAllVisible?.(checked === true)}
						aria-label={$t('list.selectAll')}
					/>
				</div>
			</div>
		{/if}
		{#each columns as column (column.key)}
			<div class={cn('flex items-center', colSpanClass[columnSpan(column)], column.class)}>
				{#if column.sortable && onSort && sort}
					<button
						type="button"
						class={cn(
							'flex items-center gap-1 transition-colors hover:text-foreground',
							sort.column === column.key && 'text-foreground',
						)}
						aria-label={listSortButtonLabel(sort.column, sort.dir, column.key, column.label)}
						onclick={() => onSort(column.key)}
					>
						{column.label}
						{#if sort.column === column.key}
							{#if sort.dir === 'asc'}
								<ChevronUp class="h-3 w-3" />
							{:else}
								<ChevronDown class="h-3 w-3" />
							{/if}
						{/if}
					</button>
				{:else}
					{column.label}
				{/if}
			</div>
		{/each}
		{@render trailingHeader?.()}
	</div>
	<InfiniteList
		{hasMore}
		{total}
		{visibleCount}
		loading={loading || loadingMore}
		{onLoadMore}
	>
		<ul class={cn(loading && 'opacity-60')}>
			{#each rows as rowItem (rowItem.id)}
				{@const active = highlightId === rowItem.id}
				{@const selected = selectedSet.has(rowItem.id)}
				{@const ctx = { selectionMode, selected, active }}
				<li>
					<div
						role="button"
						tabindex="0"
						onclick={() => handleRowClick(rowItem)}
						onkeydown={event => handleRowKeydown(event, rowItem)}
						class={cn(
							'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 text-left transition-colors last:border-b-0',
							rowPaddingClass,
							active ? 'bg-primary/10' : 'hover:bg-secondary',
							selectionMode && selected && 'bg-primary/5',
							rowClass?.(rowItem, ctx),
						)}
					>
						{#if selectionMode}
							<div class="col-span-1 flex items-center" role="presentation" onclick={event => event.stopPropagation()}>
								<Checkbox
									class="rounded-[2px]"
									checked={selected}
									onCheckedChange={checked => onToggleSelected?.(rowItem.id, checked === true)}
									aria-label={$t('list.selectRow')}
								/>
							</div>
						{/if}
						{@render row(rowItem, ctx)}
					</div>
				</li>
			{/each}
			{#if rows.length === 0 && !loading}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">
					{resolvedEmptyLabel}
				</li>
			{/if}
		</ul>
	</InfiniteList>
</div>
