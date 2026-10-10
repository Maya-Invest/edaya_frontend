<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirmer',
		cancelLabel = 'Annuler',
		busy = false,
		confirmDisabled = false,
		variant = 'destructive',
		onCancel,
		onOpenChange,
		onConfirm,
	}: {
		open?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		busy?: boolean;
		confirmDisabled?: boolean;
		variant?: 'default' | 'destructive';
		onCancel?: () => void;
		onOpenChange?: (open: boolean) => void;
		onConfirm: () => void | Promise<void>;
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
	{#if open}
		<Dialog.Content data-testid="confirm-modal">
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				{#if description}
					<Dialog.Description>{description}</Dialog.Description>
				{/if}
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="ghost" onclick={close} disabled={busy}>{cancelLabel}</Button>
				<Button variant={variant} onclick={onConfirm} disabled={busy || confirmDisabled}>{confirmLabel}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
