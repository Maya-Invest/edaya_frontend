<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from '$lib/i18n';
	import { X } from '$lib/icons';

	const { onClose, children }: { onClose: () => void; children: Snippet } = $props();
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !document.querySelector('[data-testid="form-modal"], [data-testid="confirm-modal"]'))
			onClose();
	}
</script>
<svelte:window onkeydown={handleKeydown} />
<div role="presentation" onclick={onClose} class="fixed inset-0 z-40 bg-primary/5 motion-safe:animate-fade-in"></div>
<aside aria-label={$t('finance.billing')} class="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-panel motion-safe:animate-slide-in-right md:w-1/2">
	<div class="flex min-h-0 flex-1 flex-col">
		<header class="flex items-center justify-between border-b border-border px-6 py-4">
			<h2>{$t('finance.billing')}</h2>
			<button type="button" aria-label={$t('common.close')} onclick={onClose} class="rounded-full p-2 hover:bg-secondary"><X class="size-4" /></button>
		</header>
		<div class="min-h-0 flex-1 overflow-y-auto p-6">{@render children()}</div>
	</div>
</aside>
