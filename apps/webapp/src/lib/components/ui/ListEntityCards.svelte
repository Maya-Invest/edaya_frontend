<script lang="ts" generics="TRow extends { id: string }">
	import type { ListEntityTableColumn, ListEntityTableRowContext } from '$lib/list/list-entity-table-types';
	import type { Snippet } from 'svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListEntityCard from '$lib/components/ui/ListEntityCard.svelte';
	import { t } from '$lib/i18n';
	import { collectionPresentation } from '$lib/list/collection-presentation.svelte';

	const presentation = collectionPresentation();
	import { cardFieldShowsLabel, cardFieldsByZone } from '$lib/list/list-card-fields';

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
		loading = false,
		loadingMore = false,
		hasMore = false,
		total = 0,
		visibleCount = 0,
		onLoadMore,
		cardClass,
		onRowClick,
		field: renderField,
		actions: renderActions,
		emptyLabel,
	}: {
		columns: ListEntityTableColumn[];
		rows: readonly TRow[];
		highlightId?: string;
		sort?: { column: string; dir: 'asc' | 'desc' | string };
		onSort?: (column: string) => void;
		columnsPerRow?: number;
		onColumnsPerRowChange?: (columnsPerRow: number) => void;
		selectionMode?: boolean;
		selectedIds?: readonly string[];
		onToggleSelected?: (id: string, checked: boolean) => void;
		loading?: boolean;
		loadingMore?: boolean;
		hasMore?: boolean;
		total?: number;
		visibleCount?: number;
		onLoadMore?: () => void;
		cardClass?: (row: TRow, ctx: ListEntityTableRowContext) => string | false | undefined;
		onRowClick?: (row: TRow) => void;
		field: Snippet<[TRow, string, ListEntityTableRowContext]>;
		actions?: Snippet<[TRow, ListEntityTableRowContext]>;
		emptyLabel?: string;
	} = $props();

	const selectedSet = $derived(new Set(selectedIds));
	const resolvedEmptyLabel = $derived(emptyLabel ?? $t('students.noMatch'));
	const fieldsByZone = $derived(cardFieldsByZone(columns));

	const sortableColumns = $derived(columns.filter(column => column.sortable));

	function rowContext(row: TRow): ListEntityTableRowContext {
		return {
			selectionMode,
			selected: selectedSet.has(row.id),
			active: highlightId === row.id,
		};
	}
	$effect(() => {
		if (presentation) {
			presentation.hiddenSort = '';
			presentation.sorts = onSort && sort ? sortableColumns.map(c => ({ key: c.key, label: listSortButtonLabel(sort.column, sort.dir, c.key, c.label), active: sort.column === c.key, run: () => onSort(c.key) })) : [];
		}
	});
</script>

<div class="ui-collection" aria-busy={loading}>

	<InfiniteList
		{hasMore}
		{total}
		{visibleCount}
		loading={loading || loadingMore}
		{onLoadMore}
	>
		<div class={cn('divide-y divide-border', loading && 'opacity-60')}>
			{#each rows as row (row.id)}
				{@const ctx = rowContext(row)}
				{@const zoneFields = fieldsByZone}
				<ListEntityCard
					layout="row"
					{selectionMode}
					selected={ctx.selected}
					active={ctx.active}
					showHeader={zoneFields.header.length > 0}
					showBody={zoneFields.body.length > 0}
					showFooter={zoneFields.footer.length > 0}
					showActions={!selectionMode && Boolean(renderActions)}
					onToggleSelected={checked => onToggleSelected?.(row.id, checked)}
					onClick={onRowClick ? () => onRowClick(row) : undefined}
					cardClass={cardClass?.(row, ctx)}
				>
					{#snippet header(cardCtx)}
						<div class="flex flex-col gap-2">
							{#each zoneFields.header as column (column.key)}
								<div class="flex flex-col gap-0.5">
									{#if cardFieldShowsLabel(column)}
										<span
											class="font-sans tabular-nums text-xs font-medium text-muted-foreground"
										>
											{column.label}
										</span>
									{/if}
									<div>{@render renderField(row, column.key, cardCtx)}</div>
								</div>
							{/each}
						</div>
					{/snippet}
					{#snippet body(cardCtx)}
						<div class="flex flex-col gap-2">
							{#each zoneFields.body as column (column.key)}
								<div class="flex flex-col gap-0.5">
									{#if cardFieldShowsLabel(column)}
										<span
											class="font-sans tabular-nums text-xs font-medium text-muted-foreground"
										>
											{column.label}
										</span>
									{/if}
									<div>{@render renderField(row, column.key, cardCtx)}</div>
								</div>
							{/each}
						</div>
					{/snippet}
					{#snippet footer(cardCtx)}
						<div class="flex w-full flex-wrap items-end justify-between gap-3">
							{#each zoneFields.footer as column (column.key)}
								<div class="flex min-w-0 flex-col gap-0.5">
									{#if cardFieldShowsLabel(column)}
										<span
											class="font-sans tabular-nums text-xs font-medium text-muted-foreground"
										>
											{column.label}
										</span>
									{/if}
									<div>{@render renderField(row, column.key, cardCtx)}</div>
								</div>
							{/each}
						</div>
					{/snippet}
					{#snippet actions()}
						{@render renderActions?.(row, ctx)}
					{/snippet}
				</ListEntityCard>
			{/each}
		</div>
		{#if rows.length === 0 && !loading}
			<p class="px-5 pb-12 text-center text-sm text-muted-foreground">{resolvedEmptyLabel}</p>
		{/if}
	</InfiniteList>
</div>
