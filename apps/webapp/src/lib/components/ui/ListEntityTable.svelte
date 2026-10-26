<script lang="ts" generics="TRow extends { id: string }">
	import type { ListEntityTableColumn, ListEntityTableRowContext } from '$lib/list/list-entity-table-types';
	import type { Snippet } from 'svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { ChevronDown, ChevronUp } from '$lib/icons';
	import { listSortAriaValue, listSortButtonLabel } from '$lib/list/list-sort-label';
	import { availableTableColumns, loadTableColumnKeys, resolveTableColumnKeys, saveTableColumnKeys, tableColumnStorageKey } from '$lib/list/table-column-preferences';
	import { cn } from '$lib/utils';

	const { columns, rows, listKey, highlightId, sort, onSort, selectionMode = false, selectedIds = [], onToggleSelected, onToggleAllVisible, allVisibleSelected = false, loading = false, loadingMore = false, hasMore = false, total = 0, visibleCount = 0, onLoadMore, rowClass, onRowClick, cell, emptyLabel, rowPaddingClass = 'py-3.5', onVisibleColumnsChange }: {
		columns: ListEntityTableColumn[];
		rows: readonly TRow[];
		listKey: string;
		highlightId?: string;
		sort?: {
			column: string;
			dir: 'asc' | 'desc' | string;
		};
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
		cell: Snippet<[
			TRow,
			ListEntityTableColumn,
			ListEntityTableRowContext,
		]>;
		emptyLabel?: string;
		rowPaddingClass?: string;
		onVisibleColumnsChange?: (keys: string[]) => void;
	} = $props();
	let savedKeys = $state<string[] | null>(null);
	let preferenceIdentity = $state('');
	let query = $state('');
	const available = $derived(availableTableColumns(columns));
	const storageKey = $derived(authSession.subjectId && authSession.schoolId
		? tableColumnStorageKey(authSession.subjectId, authSession.schoolId, listKey)
		: '');
	const resolvedKeys = $derived(resolveTableColumnKeys(available, savedKeys));
	const visibleColumns = $derived(resolvedKeys.flatMap(key => available.filter(column => column.key === key)));
	const choices = $derived(available.filter(column => column.key !== 'actions' && `${column.label} ${column.group ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).toSorted((left, right) => (left.group ?? '').localeCompare(right.group ?? '')));
	const hiddenSort = $derived(sort && !resolvedKeys.includes(sort.column) ? available.find(column => column.key === sort.column) : undefined);
	const template = $derived([
		...(selectionMode ? ['2.5rem'] : []),
		...visibleColumns.map(column => column.key === 'actions' ? '3rem' : `minmax(${column.minWidth ?? Math.max(100, column.span * 48)}px, ${Math.max(1, column.span)}fr)`),
	].join(' '));
	const minimumWidth = $derived(visibleColumns.reduce((sum, column) => sum + (column.key === 'actions' ? 48 : column.minWidth ?? Math.max(100, column.span * 48)), selectionMode ? 40 : 0) + 40 + visibleColumns.length * 16);
	const selectedSet = $derived(new Set(selectedIds));
	const resolvedEmptyLabel = $derived(emptyLabel ?? $t('students.noMatch'));
	$effect(() => {
		if (preferenceIdentity !== storageKey) {
			preferenceIdentity = storageKey;
			savedKeys = storageKey ? loadTableColumnKeys(storageKey) : null;
			query = '';
		}
	});
	$effect(() => {
		onVisibleColumnsChange?.(resolvedKeys);
		if (storageKey && preferenceIdentity === storageKey && savedKeys)
			saveTableColumnKeys(storageKey, resolvedKeys);
	});
	function updateKeys(keys: string[] | null) {
		savedKeys = keys === null ? null : resolveTableColumnKeys(available, keys);
		if (storageKey)
			saveTableColumnKeys(storageKey, resolveTableColumnKeys(available, savedKeys));
	}
	function toggleColumn(key: string, checked: boolean) {
		updateKeys(checked ? [...resolvedKeys, key] : resolvedKeys.filter(value => value !== key));
	}

</script>

<div class="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft" aria-busy={loading}>
	<div class="flex min-h-12 flex-wrap items-center justify-end gap-3 border-b border-border px-4 py-2">
		{#if hiddenSort}<span class="mr-auto text-xs text-muted-foreground">{$t('list.sortedBy', { column: hiddenSort.label })} · {sort?.dir === 'asc' ? '↑' : '↓'}</span>{/if}
		<Popover.Popover>
			<Popover.PopoverTrigger>
				{#snippet child({ props })}<Button {...props} variant="outline" size="sm" data-testid="table-columns">{$t('list.columns')}</Button>{/snippet}
			</Popover.PopoverTrigger>
			<Popover.PopoverContent align="end" class="w-80 space-y-3">
				<label class="block text-sm font-medium">{$t('list.columnsSearch')}<Input bind:value={query} class="mt-2" /></label>
				<div class="max-h-80 space-y-1 overflow-y-auto">
					{#each choices as column, index (column.key)}
						{#if index === 0 || choices[index - 1]?.group !== column.group}<p class="pt-2 text-xs font-semibold text-muted-foreground">{column.group || $t('list.columnsFields')}</p>{/if}
						<label class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary">
							<Checkbox checked={resolvedKeys.includes(column.key)} disabled={column.required || column.key === available.find(value => value.key !== 'actions')?.key} onCheckedChange={checked => toggleColumn(column.key, checked === true)} />
							{column.label}
						</label>
					{/each}
				</div>
				<div class="flex flex-wrap gap-2 border-t border-border pt-2"><Button variant="ghost" size="sm" onclick={() => updateKeys(available.map(column => column.key))}>{$t('list.columnsShowAll')}</Button><Button variant="ghost" size="sm" onclick={() => updateKeys(null)}>{$t('list.columnsReset')}</Button></div>
			</Popover.PopoverContent>
		</Popover.Popover>
	</div>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="overflow-x-auto control-focus" role="region" aria-label={$t('list.tableRegion')} tabindex="0">
		<div role="table" style:min-width="{Math.max(768, minimumWidth)}px">
			<div role="row" class="grid gap-4 border-b border-border bg-secondary/60 px-5 py-3 text-xs font-semibold text-muted-foreground" style:grid-template-columns={template}>
				{#if selectionMode}<div role="columnheader"><Checkbox checked={allVisibleSelected} onCheckedChange={checked => onToggleAllVisible?.(checked === true)} aria-label={$t('list.selectAll')} /></div>{/if}
				{#each visibleColumns as column (column.key)}
					<div class={cn('flex items-center', column.class)} role="columnheader" aria-sort={column.sortable && sort ? listSortAriaValue(sort.column, sort.dir, column.key) : undefined}>
						{#if column.sortable && onSort && sort}<button type="button" data-testid="list-sort" class="flex items-center gap-1 hover:text-foreground" aria-label={listSortButtonLabel(sort.column, sort.dir, column.key, column.label)} onclick={() => onSort(column.key)}>{column.label}{#if sort.column === column.key}{#if sort.dir === 'asc'}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}{/if}</button>{:else}{column.label}{/if}
					</div>
				{/each}
			</div>
			<InfiniteList {hasMore} {total} {visibleCount} loading={loading || loadingMore} {onLoadMore}>
				<div role="rowgroup" class={cn(loading && 'opacity-60')}>
					{#each rows as item (item.id)}
						{@const ctx = { selectionMode, selected: selectedSet.has(item.id), active: highlightId === item.id }}
						<div role="row" data-entity-id={item.id} class={cn('grid min-h-12 items-center gap-4 border-b border-border px-4 text-left last:border-b-0', rowPaddingClass, ctx.active ? 'bg-primary/10' : onRowClick ? 'cursor-pointer hover:bg-secondary' : '', selectionMode && ctx.selected && 'bg-primary/5', rowClass?.(item, ctx))} style:grid-template-columns={template}>
							{#if selectionMode}<div role="cell"><Checkbox checked={ctx.selected} onCheckedChange={checked => onToggleSelected?.(item.id, checked === true)} aria-label={$t('list.selectRow')} /></div>{/if}
							{#each visibleColumns as column, columnIndex (column.key)}
								<div role="cell" class="min-w-0 break-words" data-column={column.key}>
									{#if onRowClick && columnIndex === 0 && column.key !== 'actions'}
										<button type="button" class="control-focus min-h-11 w-full rounded-lg text-left font-semibold" onclick={() => onRowClick(item)}>{@render cell(item, column, ctx)}</button>
									{:else}{@render cell(item, column, ctx)}{/if}
								</div>
							{/each}
						</div>
					{/each}
					{#if rows.length === 0 && !loading}<div role="row"><div role="cell" class="px-4 py-12 text-center text-sm text-muted-foreground">{resolvedEmptyLabel}</div></div>{/if}
				</div>
			</InfiniteList>
		</div>
	</div>
</div>
