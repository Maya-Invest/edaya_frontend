<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import { t } from '$lib/i18n';
	import { X } from '$lib/icons';

	const { onClose, children }: { onClose: () => void; children: Snippet } = $props();
</script>
<DrawerFrame {onClose} label={$t('finance.billing')}>
	<div class="flex min-h-0 flex-1 flex-col">
		<header class="flex items-center justify-between border-b border-border px-6 py-4">
			<h2>{$t('finance.billing')}</h2>
			<Button size="icon" variant="ghost" aria-label={$t('common.close')} onclick={onClose} class="rounded-full p-2 hover:bg-secondary"><X class="size-4" /></Button>
		</header>
		<div class="min-h-0 flex-1 overflow-y-auto p-6">{@render children()}</div>
	</div>
</DrawerFrame>
