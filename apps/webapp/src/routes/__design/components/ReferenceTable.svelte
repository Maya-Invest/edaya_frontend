<script lang="ts" generics="TRow extends { id: string; name: string }">
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { Snippet } from 'svelte';
	import type { ReferenceCopy } from '../reference-copy';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { MoreHorizontal } from '$lib/icons';
	import { availableTableColumns, resolveTableColumnKeys } from '$lib/list/table-column-preferences';
	import Button from './ReferenceButton.svelte';

	// Local visual prototype. No auth state, browser preferences or business APIs.
	const { copy, columns, rows, visibleKeys, onColumnsChange, selecting, selectedIds, onToggle, onToggleLoaded, onInspect, sort, onSort, cell, openRecordId = null, actions, label }: {
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
	let columnQuery = $state('');
	const available = $derived(availableTableColumns(columns).filter(column => column.key !== 'actions'));
	const visible = $derived(available.filter(column => visibleKeys.includes(column.key)));
	const choices = $derived(available.filter(column => column.label.toLocaleLowerCase().includes(columnQuery.toLocaleLowerCase())));
	const selected = $derived(new Set(selectedIds));
	const selectedLoaded = $derived(rows.filter(row => selected.has(row.id)).length);
	const allLoaded = $derived(rows.length > 0 && selectedLoaded === rows.length);
	const mixed = $derived(selectedLoaded > 0 && !allLoaded);
	const minimumWidth = $derived(visible.reduce((width, column) => width + (column.minWidth ?? 120), 64));
	function toggleColumn(key: string, checked: boolean) {
		onColumnsChange(resolveTableColumnKeys(columns, checked ? [...visibleKeys, key] : visibleKeys.filter(value => value !== key)));
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="reference-table-scroll control-focus" role="region" aria-label={$t('list.tableRegion')} tabindex="0" data-testid="reference-table-scroll">
	<table class="reference-table" style:min-width="{minimumWidth}px" aria-label={label ?? copy.students}>
		<colgroup>{#each visible as column (column.key)}<col style:width="{column.minWidth ?? 120}px" />{/each}<col style:width="64px" /></colgroup>
		<thead><tr>
			{#each visible as column (column.key)}
				<th scope="col" data-column={column.key} class:reference-number={column.key === 'amount'} aria-sort={sort.key === column.key ? sort.direction : undefined}>
					<button type="button" class="reference-sort control-focus" onclick={() => onSort(column.key)} aria-label={`${copy.sortBy} ${column.label}`}>
						{column.label}{#if sort.key === column.key}<span aria-hidden="true">{sort.direction === 'ascending' ? '↑' : '↓'}</span>{/if}
					</button>
				</th>
			{/each}
			<th scope="col" class="reference-utility" data-testid="reference-utility-header">
				{#if selecting}
					<Checkbox class="reference-checkbox" checked={allLoaded} indeterminate={mixed} disabled={!rows.length} onCheckedChange={onToggleLoaded} aria-label={$t('list.selectAll')} />
				{:else}
					<Popover.Popover>
						<Popover.PopoverTrigger>{#snippet child({ props })}<Button {...props} size="icon" variant="ghost" class="reference-icon" aria-label={copy.customize} data-testid="reference-customize"><MoreHorizontal aria-hidden="true" /></Button>{/snippet}</Popover.PopoverTrigger>
						<Popover.PopoverContent align="end" collisionPadding={16} class="reference-customize-panel space-y-4" aria-label={copy.customize}>
							<h3 class="text-sm font-semibold">{copy.columns}</h3>
							<label class="block space-y-2 text-sm"><span>{$t('list.columnsSearch')}</span><Input bind:value={columnQuery} /></label>
							<div class="reference-column-choices">
								{#each choices as column (column.key)}
									<label class="reference-column-choice text-sm"><Checkbox class="reference-checkbox" checked={visibleKeys.includes(column.key)} disabled={column.required || column.key === available[0]?.key} onCheckedChange={checked => toggleColumn(column.key, checked)} />{column.label}{#if column.required || column.key === available[0]?.key}<span class="text-xs text-muted-foreground">{copy.required}</span>{/if}</label>
								{:else}<p class="text-sm">{copy.noMatch}</p>{/each}
							</div>
							<div class="flex flex-wrap gap-2 border-t pt-2"><Button variant="ghost" onclick={() => onColumnsChange(available.map(column => column.key))}>{$t('list.columnsShowAll')}</Button><Button variant="ghost" onclick={() => onColumnsChange(null)}>{$t('list.columnsReset')}</Button></div>
						</Popover.PopoverContent>
					</Popover.Popover>
				{/if}
			</th>
		</tr></thead>
		<tbody>
			{#each rows as row (row.id)}
				<tr data-selected={selecting && selected.has(row.id)} data-open={openRecordId === row.id} data-row={row.id}>
					{#each visible as column, index (column.key)}
						<td data-column={column.key} class:reference-number={column.key === 'amount'}>
							{#if index === 0}<button type="button" class="reference-identity control-focus" aria-current={openRecordId === row.id ? 'true' : undefined} aria-haspopup="dialog" onclick={() => onInspect(row)}>{@render cell(row, column)}</button>{:else}{@render cell(row, column)}{/if}
						</td>
					{/each}
					<td class="reference-utility">
						{#if selecting}<Checkbox class="reference-checkbox" checked={selected.has(row.id)} onCheckedChange={checked => onToggle(row.id, checked)} aria-label={`${copy.selectRecord} ${row.name}`} />
						{:else if actions}{@render actions(row)}{/if}
					</td>
				</tr>
			{:else}<tr><td colspan={visible.length + 1} class="reference-empty">{copy.noMatch}</td></tr>{/each}
		</tbody>
	</table>
</div>
