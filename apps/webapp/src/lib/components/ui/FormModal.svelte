<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';

	let {
		open = $bindable(false),
		title,
		description,
		submitLabel = 'Enregistrer',
		cancelLabel = 'Annuler',
		busy = false,
		submitDisabled = false,
		children,
		onCancel,
		onOpenChange,
		onSubmit,
	}: {
		open?: boolean;
		title: string;
		description?: string;
		submitLabel?: string;
		cancelLabel?: string;
		busy?: boolean;
		submitDisabled?: boolean;
		children?: Snippet;
		onCancel?: () => void;
		onOpenChange?: (open: boolean) => void;
		onSubmit: () => void | Promise<void>;
	} = $props();

	function handleOpenChange(next: boolean) {
		open = next;
		if (!next) {
			onOpenChange?.(false);
		}
	}

	function close() {
		onCancel?.();
		handleOpenChange(false);
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content data-testid="form-modal">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<div class="space-y-4 py-2">
			{@render children?.()}
		</div>
		<Dialog.Footer>
			<Button variant="ghost" onclick={close} disabled={busy}>{cancelLabel}</Button>
			<Button onclick={onSubmit} disabled={busy || submitDisabled}>{submitLabel}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
