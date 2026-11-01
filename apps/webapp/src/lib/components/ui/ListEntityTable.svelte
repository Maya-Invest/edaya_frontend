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
	import { ChevronDown, ChevronUp, MoreHorizontal } from '$lib/icons';
	import { collectionPresentation } from '$lib/list/collection-presentation.svelte';
	import { listSortAriaValue, listSortButtonLabel } from '$lib/list/list-sort-label';
	import { availableTableColumns, loadTableColumnKeys, resolveTableColumnKeys, saveTableColumnKeys, tableColumnStorageKey } from '$lib/list/table-column-preferences';

	const presentation = collectionPresentation();
	import { cn } from '$lib/utils';

	const { columns, rows, listKey, highlightId, sort, onSort, selectionMode = false, selectedIds = [], onToggleSelected, onToggleAllVisible, loading = false, loadingMore = false, hasMore = false, total = 0, visibleCount = 0, onLoadMore, rowClass, onRowClick, cell, emptyLabel, onVisibleColumnsChange, isRowSelectable = () => true, persistPreferences = true, canInspect = () => true }: {
		columns: ListEntityTableColumn[];
		rows: readonly TRow[];
		isRowSelectable?: (row: TRow) => boolean;
		listKey: string;
		persistPreferences?: boolean;
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
		canInspect?: (row: TRow) => boolean;
		cell: Snippet<[
			TRow,
			ListEntityTableColumn,
			ListEntityTableRowContext,
		]>;
		emptyLabel?: string;
		rowPaddingClass?: string;
		onVisibleColumnsChange?: (keys: string[]) => void;
	} = $props();
	let viewportWidth = $state(0);
	let savedKeys = $state<string[] | null>(null);
	let preferenceIdentity = $state('');
	let query = $state('');
	const available = $derived(availableTableColumns(columns));
	const storageKey = $derived(persistPreferences && authSession.subjectId && authSession.schoolId
		? tableColumnStorageKey(authSession.subjectId, authSession.schoolId, listKey)
		: '');
	const resolvedKeys = $derived(resolveTableColumnKeys(available, savedKeys));
	const visibleColumns = $derived(resolvedKeys.flatMap(key => available.filter(column => column.key === key)));
	const choices = $derived(available.filter(column => column.key !== 'actions' && `${column.label} ${column.group ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).toSorted((left, right) => (left.group ?? '').localeCompare(right.group ?? '')));
	const hiddenSort = $derived(sort && !resolvedKeys.includes(sort.column) ? available.find(column => column.key === sort.column) : undefined);
	const dataColumns = $derived(visibleColumns.filter(column => column.key !== 'actions'));
	const actionColumn = $derived(available.find(column => column.key === 'actions'));
	const minimumWidth = $derived(dataColumns.reduce((sum, column) => sum + (column.minWidth ?? Math.max(100, column.span * 48)), 64));
	const renderedWidth = $derived(Math.max(minimumWidth, viewportWidth));
	const totalWeight = $derived(dataColumns.reduce((sum, column) => sum + Math.max(1, column.span), 0));
	const selectable = $derived(rows.filter(isRowSelectable));
	const selectedLoaded = $derived(selectable.filter(row => selectedIds.includes(row.id)).length);
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

	$effect(() => {
		if (presentation) {
			presentation.hiddenSort = hiddenSort ? `${$t('list.sortedBy', { column: hiddenSort.label })} · ${sort?.dir === 'asc' ? '↑' : '↓'}` : '';
			presentation.sorts = onSort && sort ? available.filter(c => c.sortable).map(c => ({ key: c.key, label: listSortButtonLabel(sort.column, sort.dir, c.key, c.label), active: sort.column === c.key, run: () => onSort(c.key) })) : [];
		}
	});
	function toggleLoaded(checked: boolean) {
		if (selectable.length === rows.length && onToggleAllVisible) {
			onToggleAllVisible(checked);
		}
		else {
			for (const row of selectable) onToggleSelected?.(row.id, checked);
		}
	}
</script>

<div class="ui-collection ui-table-container" aria-busy={loading}>
	<InfiniteList {hasMore} {total} {visibleCount} loading={loading || loadingMore} {onLoadMore}>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div bind:clientWidth={viewportWidth} class="overflow-x-auto control-focus" role="region" aria-label={$t('list.tableRegion')} tabindex="0">
			<table class="ui-table" style:min-width="{minimumWidth}px">
				<!-- Fixed-layout tables ignore mixed percentage/length calc() column widths. -->
				<colgroup>{#each dataColumns as column (column.key)}<col style:width="{Math.max(1, column.span) / totalWeight * (renderedWidth - 64)}px" />{/each}<col style:width="64px" /></colgroup>
				<thead><tr>
					{#each dataColumns as column (column.key)}<th scope="col" class={column.class} aria-sort={column.sortable && sort ? listSortAriaValue(sort.column, sort.dir, column.key) : undefined}>
						{#if column.sortable && onSort && sort}<button type="button" data-testid="list-sort" class="ui-table-sort control-focus" aria-label={listSortButtonLabel(sort.column, sort.dir, column.key, column.label)} onclick={() => onSort(column.key)}>{column.label}{#if sort.column === column.key}{#if sort.dir === 'asc'}<ChevronUp class="h-4 w-4" />{:else}<ChevronDown class="h-4 w-4" />{/if}{/if}</button>{:else}{column.label}{/if}
					</th>{/each}
					<th scope="col" class="ui-table-utility"><div class="ui-utility-target">
						{#if selectionMode}<Checkbox class="ui-checkbox-target" checked={selectable.length > 0 && selectedLoaded === selectable.length} indeterminate={selectedLoaded > 0 && selectedLoaded < selectable.length} disabled={!selectable.length} onCheckedChange={checked => toggleLoaded(checked === true)} aria-label={$t('list.selectAll')} />{:else}
							<Popover.Popover>
								<Popover.PopoverTrigger>
									{#snippet child({ props })}<Button {...props} variant="ghost" size="icon" iconTreatment="quiet" aria-label={$t('list.customize')} data-testid="table-columns"><MoreHorizontal /></Button>{/snippet}
								</Popover.PopoverTrigger>
								<Popover.PopoverContent align="end" class="w-80 space-y-3">
									<h3 class="text-sm font-semibold">{$t('list.columns')}</h3><label class="block text-sm font-medium">{$t('list.columnsSearch')}<Input bind:value={query} class="mt-2" /></label>
									<div class="max-h-80 space-y-1 overflow-y-auto">
										{#each choices as column, index (column.key)}
											{#if index === 0 || choices[index - 1]?.group !== column.group}<p class="pt-2 text-xs font-semibold text-muted-foreground">{column.group || $t('list.columnsFields')}</p>{/if}
											<label class="flex cursor-pointer items-center gap-2 rounded-collection px-2 py-1.5 text-sm hover:bg-secondary">
												<Checkbox checked={resolvedKeys.includes(column.key)} disabled={column.required || column.key === available.find(value => value.key !== 'actions')?.key} onCheckedChange={checked => toggleColumn(column.key, checked === true)} />
												{column.label}
											</label>
										{/each}
									</div>
									<div class="flex flex-wrap gap-2 border-t border-border pt-2"><Button variant="ghost" size="sm" onclick={() => updateKeys(available.map(column => column.key))}>{$t('list.columnsShowAll')}</Button><Button variant="ghost" size="sm" onclick={() => updateKeys(null)}>{$t('list.columnsReset')}</Button></div>
								</Popover.PopoverContent>
							</Popover.Popover>
						{/if}</div></th>
				</tr></thead>
				<tbody class={cn(loading && 'opacity-60')}>
					{#each rows as item (item.id)}{@const ctx = { selectionMode, selected: selectedSet.has(item.id), active: highlightId === item.id }}
						<tr data-entity-id={item.id} data-open-record={ctx.active} data-bulk-selected={selectionMode && ctx.selected} class={cn('ui-collection-row', rowClass?.(item, ctx))}>
							{#each dataColumns as column, index (column.key)}<td data-column={column.key}>
								{#if onRowClick && canInspect(item) && index === 0}<button type="button" class="ui-record-target control-focus" aria-current={ctx.active ? 'true' : undefined} onclick={() => onRowClick(item)}>{@render cell(item, column, ctx)}</button>{:else}{@render cell(item, column, ctx)}{/if}
							</td>{/each}
							<td class="ui-table-utility" data-column="actions"><div class="ui-utility-target">{#if selectionMode}<Checkbox class="ui-checkbox-target" checked={ctx.selected} disabled={!isRowSelectable(item)} onCheckedChange={checked => onToggleSelected?.(item.id, checked === true)} aria-label={$t('list.selectRow')} />{:else if actionColumn}{@render cell(item, actionColumn, ctx)}{/if}</div></td>
						</tr>{/each}
					{#if rows.length === 0 && !loading}<tr><td colspan={dataColumns.length + 1} class="ui-table-empty">{resolvedEmptyLabel}</td></tr>{/if}
				</tbody></table></div></InfiniteList>
</div>
