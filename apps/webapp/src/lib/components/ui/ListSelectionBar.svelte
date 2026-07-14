<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';

	const {
		selectedCount,
		onExport,
		onClear,
		actions,
	}: {
		selectedCount: number;
		onExport: () => void;
		onClear: () => void;
		/** Route-local bulk actions rendered between Export and Clear. */
		actions?: Snippet;
	} = $props();
</script>

<div class="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2 shadow-soft">
	<p class="text-sm font-medium">
		{selectedCount > 0
			? $t('list.selectedCount', { n: selectedCount })
			: $t('list.selectRowsHint')}
	</p>
	<div class="flex items-center gap-2">
		<Button
			variant="outline"
			size="sm"
			class="rounded-full"
			disabled={selectedCount === 0}
			onclick={onExport}
		>
			{$t('list.export')}
		</Button>
		{@render actions?.()}
		<Button variant="ghost" size="sm" class="rounded-full" onclick={onClear}>
			{$t('common.clear')}
		</Button>
	</div>
</div>
