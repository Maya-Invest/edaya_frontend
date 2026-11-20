<script lang="ts" generics="TRow extends { id: string; name: string }">
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { Snippet } from 'svelte';
	import type { ReferenceCopy } from '../reference-copy';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	// Fixture props only; presentation comes from the production Table. Preferences are ephemeral.
	const { copy, columns, rows, onColumnsChange, selecting, selectedIds, onToggle, onToggleLoaded, onInspect, sort, onSort, cell: renderCell, openRecordId = null, actions }: {
		copy: ReferenceCopy;
		openRecordId?: string | null;
		actions?: Snippet<[TRow]>;
		label?: string;
		columns: ListEntityTableColumn[];
		rows: readonly TRow[];
		visibleKeys: readonly string[];
		onColumnsChange: (keys: string[] | null) => void;
		selecting: boolean;
		selectedIds: readonly string[];
		onToggle: (id: string, checked: boolean) => void;
		onToggleLoaded: (checked: boolean) => void;
		onInspect: (row: TRow) => void;
		sort: { key: string; direction: 'ascending' | 'descending' };
		onSort: (key: string) => void;
		cell: Snippet<[TRow, ListEntityTableColumn]>;
	} = $props();
</script>
<ListEntityTable columns={columns.map(c => ({ ...c, sortable: c.key !== 'actions' }))} {rows} listKey="design-reference" persistPreferences={false} highlightId={openRecordId ?? undefined} sort={{ column: sort.key, dir: sort.direction === 'ascending' ? 'asc' : 'desc' }} {onSort} selectionMode={selecting} {selectedIds} onToggleSelected={onToggle} onToggleAllVisible={onToggleLoaded} onRowClick={onInspect} onVisibleColumnsChange={onColumnsChange} emptyLabel={copy.noMatch}>
	{#snippet cell(row, column)}{#if column.key === 'actions'}{@render actions?.(row)}{:else}{@render renderCell(row, column)}{/if}{/snippet}
</ListEntityTable>
