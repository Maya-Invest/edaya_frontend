<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { FileSpreadsheet, ClipboardCheck, Layers, LayoutGrid, MoreHorizontal } from '$lib/icons';
	import { toast } from '$lib/toast.svelte';

	const {
		view = 'table',
		onViewChange,
		exportOnly = false,
		exportLabel,
		onEnterSelectMode,
		onExport,
	}: {
		view?: 'table' | 'cards';
		onViewChange?: (view: 'table' | 'cards') => void;
		exportOnly?: boolean;
		exportLabel?: string;
		onEnterSelectMode?: () => void;
		onExport?: () => void;
	} = $props();

	let open = $state(false);

	const resolvedExportLabel = $derived(exportLabel ?? $t('list.export'));

	function exportStub() {
		open = false;
		if (onExport) {
			onExport();
			return;
		}
		toast.info($t('list.exportSoon'));
	}

	function setView(next: 'table' | 'cards') {
		onViewChange?.(next);
		open = false;
	}

	function enterSelectMode() {
		onEnterSelectMode?.();
		open = false;
	}
</script>

<Popover.Popover bind:open>
	<Popover.PopoverTrigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				size="sm"
				class="h-9 rounded-full px-3"
				aria-label={$t('list.moreActions')}
				data-testid="list-more-menu"
			>
				<MoreHorizontal class="h-4 w-4" />
			</Button>
		{/snippet}
	</Popover.PopoverTrigger>
	<Popover.PopoverContent class="w-48 p-1" align="end">
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
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
			onclick={exportStub}
		>
			<FileSpreadsheet class="h-4 w-4 text-muted-foreground" />
			<span>{resolvedExportLabel}</span>
		</button>
		{#if !exportOnly}
			<div class="my-1 border-t border-border"></div>
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
				onclick={() => setView('cards')}
			>
				<LayoutGrid class="h-4 w-4 text-muted-foreground" />
				<span class="flex-1">{$t('list.viewCards')}</span>
				{#if view === 'cards'}
					<span class="text-[10px] uppercase text-primary">{$t('list.active')}</span>
				{/if}
			</button>
		{/if}
	</Popover.PopoverContent>
</Popover.Popover>
