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
		variant = 'destructive',
		onCancel,
		onConfirm,
	}: {
		open?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		busy?: boolean;
		variant?: 'default' | 'destructive';
		onCancel?: () => void;
		onConfirm: () => void | Promise<void>;
	} = $props();

	function close() {
		onCancel?.();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="ghost" onclick={close} disabled={busy}>{cancelLabel}</Button>
			<Button variant={variant} onclick={onConfirm} disabled={busy}>{confirmLabel}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
