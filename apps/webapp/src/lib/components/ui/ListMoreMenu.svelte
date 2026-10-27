<script lang="ts">
	import type { CollectionMenuContext } from './collection/context';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { FileSpreadsheet, ClipboardCheck, Layers, LayoutGrid, MoreHorizontal } from '$lib/icons';
	import { getContext } from 'svelte';
	import { COLLECTION_MENU } from './collection/context';

	const {
		view = 'table',
		onViewChange,
		exportOnly = false,
		exportLabel,
		onEnterSelectMode,
		onExport,
	}: {
		view?: 'table' | 'list';
		onViewChange?: (view: 'table' | 'list') => void;
		exportOnly?: boolean;
		exportLabel?: string;
		onEnterSelectMode?: () => void;
		onExport?: () => void | Promise<void>;
	} = $props();

	let open = $state(false);
	const parentMenu = getContext<CollectionMenuContext | undefined>(COLLECTION_MENU);

	const resolvedExportLabel = $derived(exportLabel ?? $t('list.export'));

	function exportList() {
		open = false;
		parentMenu?.close();
		void onExport?.();
	}

	function setView(next: 'table' | 'list') {
		onViewChange?.(next);
		open = false;
		parentMenu?.close();
	}

	function enterSelectMode() {
		onEnterSelectMode?.();
		open = false;
		parentMenu?.close();
	}
</script>

{#snippet entries()}
	{#if onEnterSelectMode}
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
			onclick={enterSelectMode}
		>
			<ClipboardCheck class="h-4 w-4 text-muted-foreground" />
			<span>{$t('list.enterSelectMode')}</span>
		</button>
		<div class="my-1 border-t border-border"></div>
	{/if}
	{#if onExport}
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
			onclick={exportList}
		>
			<FileSpreadsheet class="h-4 w-4 text-muted-foreground" />
			<span>{resolvedExportLabel}</span>
		</button>
	{/if}
	{#if !exportOnly && onViewChange}
		{#if onExport}
			<div class="my-1 border-t border-border"></div>
		{/if}
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
			onclick={() => setView('table')}
		>
			<Layers class="h-4 w-4 text-muted-foreground" />
			<span class="flex-1">{$t('list.viewTable')}</span>
			{#if view === 'table'}
				<span class="text-[10px] uppercase text-primary">{$t('list.active')}</span>
			{/if}
		</button>
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
			onclick={() => setView('list')}
		>
			<LayoutGrid class="h-4 w-4 text-muted-foreground" />
			<span class="flex-1">{$t('list.viewCards')}</span>
			{#if view === 'list'}
				<span class="text-[10px] uppercase text-primary">{$t('list.active')}</span>
			{/if}
		</button>
	{/if}
{/snippet}

{#if parentMenu}
	{@render entries()}
{:else}
	<Popover.Popover bind:open>
		<Popover.PopoverTrigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="outline"
					size="sm"

					aria-label={$t('list.moreActions')}
					data-testid="list-more-menu"
				>
					<MoreHorizontal class="h-4 w-4" />
				</Button>
			{/snippet}
		</Popover.PopoverTrigger>
		<Popover.PopoverContent class="w-48 p-1" align="end">
			{@render entries()}
		</Popover.PopoverContent>
	</Popover.Popover>

{/if}
