<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t } from '$lib/i18n';
	import { X } from '$lib/icons';

	const { onClose, children }: { onClose: () => void; children: Snippet } = $props();
</script>
<Dialog.Root open onOpenChange={(open) => {
	if (!open)
		onClose();
}}>
	<Dialog.Content class="left-auto right-0 top-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-l p-0 md:w-1/2">
		<div class="flex min-h-0 flex-col">
			<header class="flex items-center justify-between border-b border-border px-6 py-4">
				<Dialog.Title>{$t('finance.billing')}</Dialog.Title>
				<button type="button" aria-label={$t('common.close')} onclick={onClose} class="rounded-full p-2 hover:bg-secondary"><X class="size-4" /></button>
			</header>
			<div class="min-h-0 flex-1 overflow-y-auto p-6">{@render children()}</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
