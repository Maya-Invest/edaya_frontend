<script lang="ts">
	import type { ReferenceCopy } from '../reference-copy';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import CollectionFilters from '$lib/components/ui/collection/CollectionFilters.svelte';
	import CollectionMenu from '$lib/components/ui/collection/CollectionMenu.svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { locale } from '$lib/i18n';
	import { resolveTableColumnKeys } from '$lib/list/table-column-preferences';
	import { tick } from 'svelte';
	import Button from './ReferenceButton.svelte';
	import ReferenceTable from './ReferenceTable.svelte';

	const { copy }: { copy: ReferenceCopy } = $props();
	let rows = $state([
		{ id: '1', name: 'Aminata Mariam Koné-Diabaté', className: '6e A', amount: 1250000 },
		{ id: '2', name: 'Issa Traoré', className: '6e B', amount: 0 },
		{ id: '3', name: 'Fatou Bamba', className: '6e A', amount: 800000 },
	]);
	let query = $state('');
	let previewOpen = $state('');
	let relatedQuery = $state('');
	let relatedClass = $state('');
	let editing = $state(false);
	let editingId = $state('');
	let editingName = $state('');
	let editingBaseline = $state('');
	let relatedColumns = $state<string[] | null>(null);
	let relatedSort = $state<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
	function sortRelated(key: string) {
		relatedSort = { key, direction: relatedSort.key === key && relatedSort.direction === 'ascending' ? 'descending' : 'ascending' };
	}
	const relatedRows = $derived(rows.filter(row => row.name.toLocaleLowerCase($locale).includes(relatedQuery.toLocaleLowerCase($locale)) && (!relatedClass || row.className === relatedClass)));
	function edit(row: typeof rows[number]) {
		editingId = row.id;
		editingName = row.name;
		editingBaseline = row.name;
		editing = true;
	}
	let className = $state('');
	let view = $state<'list' | 'table'>('table');
	let selecting = $state(false);
	let selection = $state<string[]>([]);
	let savedColumns = $state<string[] | null>(null);
	let sort = $state<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
	let selectionQuery = '';
	$effect(() => {
		const next = JSON.stringify([query, className]);
		if (selectionQuery !== next) {
			selectionQuery = next;
			selection = [];
		}
	});
	let record = $state<string | null>(null);
	let previous = $state<string | null>(null);
	let origin: HTMLElement | null = null;
	const visible = $derived(rows.filter(row => row.name.toLocaleLowerCase($locale).includes(query.toLocaleLowerCase($locale)) && (!className || row.className === className)).toSorted((left, right) => {
		const order = sort.key === 'amount' ? left.amount - right.amount : (sort.key === 'class' ? left.className : left.name).localeCompare(sort.key === 'class' ? right.className : right.name, $locale);
		return (sort.direction === 'ascending' ? order : -order) || left.id.localeCompare(right.id);
	}));
	const current = $derived(rows.find(row => row.id === record));
	const columns = $derived([
		{ key: 'name', label: copy.student, span: 5, required: true, minWidth: 280 },
		{ key: 'class', label: copy.className, span: 2, minWidth: 120 },
		{ key: 'amount', label: copy.amount, span: 4, minWidth: 180, class: 'justify-end' },
		{ key: 'actions', label: copy.actions, span: 1 },
	]);
	const visibleKeys = $derived(resolveTableColumnKeys(columns, savedColumns));
	const relatedHiddenSort = $derived(!resolveTableColumnKeys(columns, relatedColumns).includes(relatedSort.key) ? columns.find(column => column.key === relatedSort.key)?.label : undefined);
	const hiddenSort = $derived(view === 'table' && !visibleKeys.includes(sort.key) ? columns.find(column => column.key === sort.key)?.label : undefined);
	function changeSort(key: string) {
		sort = { key, direction: sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' };
	}
	async function exitSelection() {
		selection = [];
		selecting = false;
		await tick();
		const target = document.querySelector('#collections [data-testid=reference-customize]') ?? document.querySelector('#collections [data-testid=collection-menu]');
		if (target instanceof HTMLElement)
			target.focus();
	}
	const amount = (value: number) => new Intl.NumberFormat($locale, { style: 'currency', currency: 'XOF' }).format(value);
	function toggle(id: string, checked: boolean) {
		selection = checked ? [...new Set([...selection, id])] : selection.filter(value => value !== id);
	}
	function inspect(id: string) {
		origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		previous = null;
		record = id;
	}
	async function close() {
		record = null;
		previous = null;
		await tick();
		origin?.focus();
	}
</script>

<section id="collections" class="min-w-0 space-y-4">
	<h2 class="font-display text-xl font-semibold">{copy.collections}</h2>
	<p class="text-sm">{copy.collectionHint}</p>
	<p class="text-sm">{copy.rowStatesHint}</p>
	<label class="block max-w-lg space-y-2 text-sm"><span>{copy.openRecordPreview}</span><select data-testid="reference-open-record" class="w-full border border-input bg-card" bind:value={previewOpen}><option value="">{copy.none}</option>{#each rows as row (row.id)}<option value={row.id}>{row.name}</option>{/each}</select></label>
	<div class="reference-collection-container"><header class="reference-collection-header">
		<div class="flex min-w-0 flex-wrap items-baseline gap-2"><h3 class="font-display text-2xl font-semibold">{copy.students} · {visible.length}</h3>{#if hiddenSort}<p class="text-sm text-muted-foreground" role="status">{copy.sortBy} {hiddenSort} · {sort.direction === 'ascending' ? copy.ascending : copy.descending} · {copy.hiddenColumn}</p>{/if}</div>
		<div class="reference-collection-toolbar">
			<div data-reference-search class="min-w-0 flex-1"><ListSearchField placeholder={copy.search} bind:value={query} /></div>
			<div class="reference-collection-actions"><CollectionFilters activeCount={className ? 1 : 0} onReset={() => className = ''}><label class="block space-y-2 text-sm"><span>{copy.className}</span><select class="min-h-11 w-full border border-input bg-background px-4" bind:value={className}><option value="">{copy.all}</option><option>6e A</option><option>6e B</option></select></label></CollectionFilters>
				<CollectionMenu>
					<Button variant="ghost" aria-pressed={view === 'table'} onclick={() => view = 'table'}>{copy.table}</Button>
					<Button variant="ghost" aria-pressed={view === 'list'} onclick={() => view = 'list'}>{copy.list}</Button>
					<Button variant="ghost" aria-pressed={selecting} onclick={() => selecting ? void exitSelection() : selecting = true}>{selecting ? copy.exitSelection : copy.select}</Button>
					<Button variant="ghost" onclick={() => changeSort('name')}>{copy.sortBy} {copy.student}</Button>
					<Button variant="ghost" onclick={() => changeSort('amount')}>{copy.sortBy} {copy.amount}</Button>
				</CollectionMenu></div>
		</div>
	</header></div>
	{#if selecting}<div class="flex flex-wrap items-center justify-between gap-2 border bg-card p-4" data-testid="reference-selection-bar"><span class="text-sm" role="status">{copy.selected}: {selection.length}</span><div class="flex flex-wrap gap-2"><Button variant="outline" onclick={() => selection = []}>{copy.clearSelection}</Button><Button variant="ghost" onclick={exitSelection}>{copy.exitSelection}</Button></div></div>{/if}
	{#if view === 'table'}
		<ReferenceTable {copy} {columns} {actions} openRecordId={record ?? previewOpen} rows={visible} {visibleKeys} onColumnsChange={keys => savedColumns = keys} {selecting} selectedIds={selection} onToggle={toggle} onToggleLoaded={checked => selection = checked ? [...new Set([...selection, ...visible.map(row => row.id)])] : selection.filter(id => !visible.some(row => row.id === id))} onInspect={row => inspect(row.id)} {sort} onSort={changeSort}>
			{#snippet cell(row, column)}
				{#if column.key === 'name'}<span class="break-words font-semibold">{row.name}</span>
				{:else if column.key === 'class'}<span>{row.className}</span>
				{:else if column.key === 'amount'}<span class="text-right tabular-nums">{amount(row.amount)}</span>
				{/if}
			{/snippet}
		</ReferenceTable>
	{:else}
		<ul class="reference-list border bg-card" aria-label={copy.students}>
			{#each visible as row (row.id)}
				<li class="reference-list-row" data-row={row.id} data-open={(record ?? previewOpen) === row.id} data-selected={selecting && selection.includes(row.id)}>
					<button class="reference-list-identity control-focus" type="button" aria-current={(record ?? previewOpen) === row.id ? 'true' : undefined} aria-haspopup="dialog" onclick={() => inspect(row.id)}><span class="font-semibold">{row.name}</span><span class="text-xs text-muted-foreground">{row.className}</span><span class="tabular-nums">{amount(row.amount)}</span><span class="reference-list-chevron" aria-hidden="true">›</span></button>
					<div class="reference-list-utility">{#if selecting}<Checkbox class="reference-checkbox" checked={selection.includes(row.id)} onCheckedChange={checked => toggle(row.id, checked)} aria-label={`${copy.selectRecord} ${row.name}`} />{:else}{@render actions(row)}{/if}</div>
				</li>
			{:else}<li class="p-4 text-sm">{copy.noMatch}</li>{/each}
		</ul>
	{/if}
	<div class="reference-list border bg-card"><div class="reference-list-row"><div class="min-w-0 flex-1 space-y-2 text-sm"><p class="font-semibold">{copy.collectionOnly}</p><p>{copy.relatedHint}</p></div><div class="reference-list-utility"><RowActionMenu label={copy.collectionOnly}><RowActionMenuItem disabled title={copy.disabledReason}>{copy.edit}</RowActionMenuItem></RowActionMenu></div></div></div>
</section>
{#snippet actions(row: typeof rows[number])}
	{#if row.id !== '2'}<RowActionMenu label={`${copy.actions} · ${row.name}`}><RowActionMenuItem onclick={() => edit(row)}>{copy.edit}</RowActionMenuItem></RowActionMenu>{/if}
{/snippet}
<FormModal bind:open={editing} title={copy.formTitle} dirty={editingName !== editingBaseline} onSubmit={() => {
	rows = rows.map(row => row.id === editingId ? { ...row, name: editingName } : row);
	editing = false;
}}>
	<label class="space-y-2 text-sm"><span>{copy.name}</span><Input bind:value={editingName} required /></label>
	{#snippet footer({ close, busy, submitDisabled })}<Button variant="outline" onclick={close} disabled={busy}>{copy.cancel}</Button><Button type="submit" pendingLabel={copy.pending} aria-busy={busy} disabled={submitDisabled}>{copy.save}</Button>{/snippet}
</FormModal>
{#if current}
	<DrawerFrame label={current.name} testId="gallery-drawer" onClose={close}>
		<header class="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b p-4 md:p-6"><h2 class="min-w-0 break-words font-display text-xl font-semibold">{current.name}</h2><div class="flex gap-2">{#if previous}<Button variant="ghost" onclick={() => {
			record = previous;
			previous = null;
		}}>{copy.back}</Button>{/if}<Button variant="outline" onclick={close}>{copy.close}</Button></div></header>
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
			<section class="space-y-4"><h3 class="font-display text-xl font-semibold">{copy.details}</h3><DrawerField label={copy.className}>{current.className}</DrawerField><DrawerField label={copy.amount}><span class="tabular-nums">{amount(current.amount)}</span></DrawerField></section>
			<section class="space-y-4"><h3 class="font-display text-xl font-semibold">{copy.related}</h3><p class="text-sm">{copy.relatedHint}</p><Button variant="ghost" onclick={() => {
				previous = record;
				record = record === '1' ? '2' : '1';
			}}>{rows.find(row => row.id === (record === '1' ? '2' : '1'))?.name}</Button></section>
			<section class="space-y-4" data-testid="reference-drawer-collection">
				<p class="text-sm">{copy.drawerCollectionHint}</p>
				<div class="reference-collection-container"><header class="reference-collection-header">
					<div><h3 class="font-display text-xl font-semibold">{copy.students} · {relatedRows.length}</h3>{#if relatedHiddenSort}<p class="text-sm text-muted-foreground" role="status">{copy.sortBy} {relatedHiddenSort} · {relatedSort.direction === 'ascending' ? copy.ascending : copy.descending} · {copy.hiddenColumn}</p>{/if}</div>
					<div class="reference-collection-toolbar"><div data-reference-search><ListSearchField placeholder={copy.search} bind:value={relatedQuery} /></div><div class="reference-collection-actions">
						<CollectionFilters activeCount={relatedClass ? 1 : 0} onReset={() => relatedClass = ''}><label class="block space-y-2 text-sm"><span>{copy.className}</span><select class="w-full border border-input bg-card" bind:value={relatedClass}><option value="">{copy.all}</option><option>6e A</option><option>6e B</option></select></label></CollectionFilters>
						<CollectionMenu><Button variant="ghost" onclick={() => sortRelated('name')}>{copy.sortBy} {copy.student}</Button></CollectionMenu>
					</div></div>
				</header></div>
				<ReferenceTable {copy} {columns} rows={relatedRows.toSorted((a, b) => (relatedSort.direction === 'ascending' ? 1 : -1) * (relatedSort.key === 'amount' ? a.amount - b.amount : (relatedSort.key === 'class' ? a.className : a.name).localeCompare(relatedSort.key === 'class' ? b.className : b.name, $locale)))} visibleKeys={resolveTableColumnKeys(columns, relatedColumns)} onColumnsChange={keys => relatedColumns = keys} selecting={false} selectedIds={[]} onToggle={() => {}} onToggleLoaded={() => {}} onInspect={(row) => {
					previous = record;
					record = row.id;
				}} sort={relatedSort} onSort={sortRelated} openRecordId={record}>
					{#snippet cell(row, column)}{#if column.key === 'name'}{row.name}{:else if column.key === 'class'}{row.className}{:else if column.key === 'amount'}{amount(row.amount)}{/if}{/snippet}
				</ReferenceTable>
			</section>
		</div>
	</DrawerFrame>
{/if}
