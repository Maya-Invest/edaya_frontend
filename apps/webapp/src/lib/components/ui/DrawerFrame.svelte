<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';

	const { label, testId, onClose, children }: { label: string; testId?: string; onClose: () => void; children: Snippet } = $props();
	const dirtyWork = getDirtyWork();
	function requestClose() {
		if (dirtyWork)
			dirtyWork.request(onClose);
		else onClose();
	}
</script>
<Dialog.Root open onOpenChange={(open) => {
	if (!open)
		requestClose();
}}>
	<Dialog.Content data-testid={testId} aria-describedby={undefined} class="inset-y-0 left-auto right-0 top-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 lg:w-1/2">
		<Dialog.Title class="sr-only">{label}</Dialog.Title>
		{@render children()}
	</Dialog.Content>
</Dialog.Root>
