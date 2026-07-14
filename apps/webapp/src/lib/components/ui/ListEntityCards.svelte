<script lang="ts" generics="TRow extends { id: string }">
	import type { ListEntityTableColumn, ListEntityTableRowContext } from '$lib/list/list-entity-table-types';
	import type { Snippet } from 'svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListEntityCard from '$lib/components/ui/ListEntityCard.svelte';
	import { t } from '$lib/i18n';
	import { ChevronDown, ChevronUp } from '$lib/icons';
	import { cardFieldShowsLabel, cardFieldsByZone } from '$lib/list/list-card-fields';
	import {
		clampCardColumnsPerRow,
		listEntityCardGridClass,
		listEntityCardLayout,
	} from '$lib/list/list-entity-card-layout';
	import { listSortButtonLabel } from '$lib/list/list-sort-label';
	import { cn } from '$lib/utils';

	const {
		columns,
		rows,
		highlightId,
		sort,
		onSort,
		columnsPerRow = 3,
		onColumnsPerRowChange,
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
	const cardLayout = $derived(listEntityCardLayout(columnsPerRow));
	const gridClass = $derived(listEntityCardGridClass(columnsPerRow));
	const fieldsByZone = $derived(cardFieldsByZone(columns));

	const sortableColumns = $derived(columns.filter(column => column.sortable));

	const columnOptions = $derived(
		[1, 2, 3, 4, 5].map(value => ({
			value: String(value),
			label: $t('list.cardColumns', { n: value }),
		})),
	);

	function handleColumnsPerRowChange(value: string) {
		onColumnsPerRowChange?.(clampCardColumnsPerRow(Number(value)));
	}

	function rowContext(row: TRow): ListEntityTableRowContext {
		return {
			selectionMode,
			selected: selectedSet.has(row.id),
			active: highlightId === row.id,
		};
	}
</script>

<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft" aria-busy={loading}>
	<div
		class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-3"
	>
		<div class="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{#each sortableColumns as column (column.key)}
				{#if onSort && sort}
					<button
						type="button"
						class={cn(
							'flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors hover:bg-secondary hover:text-foreground',
							sort.column === column.key && 'bg-secondary text-foreground',
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
				{/if}
			{/each}
		</div>
		{#if onColumnsPerRowChange}
			<FilterSelect
				value={String(columnsPerRow)}
				class="h-[2.4rem] w-[10.8rem] rounded-full text-[0.9rem]"
				options={columnOptions}
				onchange={handleColumnsPerRowChange}
			/>
		{/if}
	</div>

	<InfiniteList
		{hasMore}
		{total}
		{visibleCount}
		loading={loading || loadingMore}
		{onLoadMore}
	>
		<div class={cn('grid gap-3 p-5', gridClass, loading && 'opacity-60')}>
			{#each rows as row (row.id)}
				{@const ctx = rowContext(row)}
				{@const zoneFields = fieldsByZone}
				<ListEntityCard
					layout={cardLayout}
					{selectionMode}
					selected={ctx.selected}
					active={ctx.active}
					showHeader={zoneFields.header.length > 0}
					showBody={zoneFields.body.length > 0}
					showFooter={zoneFields.footer.length > 0}
					showActions={Boolean(renderActions)}
					onToggleSelected={checked => onToggleSelected?.(row.id, checked)}
					onClick={() => onRowClick?.(row)}
					cardClass={cardClass?.(row, ctx)}
				>
					{#snippet header(cardCtx)}
						<div class="flex flex-col gap-2">
							{#each zoneFields.header as column (column.key)}
								<div class="flex flex-col gap-0.5">
									{#if cardFieldShowsLabel(column)}
										<span
											class="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
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
											class="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
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
											class="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
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
