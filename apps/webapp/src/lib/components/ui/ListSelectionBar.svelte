<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';

	const {
		selectedCount,
		onExport,
		onClear,
		onExit,
		actions,
	}: {
		selectedCount: number;
		onExport?: () => void | Promise<void>;
		onClear: () => void;
		onExit: () => void;
		/** Route-local bulk actions rendered between Export and Clear. */
		actions?: Snippet;
	} = $props();
</script>

<div class="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-collection border border-border bg-card px-4 py-2 shadow-soft">
	<p class="text-sm font-medium">
		{selectedCount > 0
			? $t('list.selectedCount', { n: selectedCount })
			: $t('list.selectRowsHint')}
	</p>
	<div class="flex flex-wrap items-center gap-2">
		{#if onExport}
			<Button
				variant="outline"
				size="sm"

				disabled={selectedCount === 0}
				onclick={onExport}
			>
				{$t('list.export')}
			</Button>
		{/if}
		{@render actions?.()}
		<Button variant="ghost" size="sm" onclick={onClear}>
			{$t('list.clearSelection')}
		</Button>
		<Button variant="ghost" onclick={onExit}>{$t('list.exitSelection')}</Button>
	</div>
</div>
