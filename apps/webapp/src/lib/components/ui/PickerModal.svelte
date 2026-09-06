<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Ajouter',
		cancelLabel = 'Annuler',
		busy = false,
		confirmDisabled = false,
		children,
		onCancel,
		onConfirm,
	}: {
		open?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		busy?: boolean;
		confirmDisabled?: boolean;
		children?: Snippet;
		onCancel?: () => void;
		onConfirm: () => void | Promise<void>;
	} = $props();

	function close() {
		onCancel?.();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content data-testid="picker-modal">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<div class="space-y-4 px-1 py-2">
			{@render children?.()}
		</div>
		<Dialog.Footer>
			<Button variant="ghost" onclick={close} disabled={busy}>{cancelLabel}</Button>
			<Button onclick={onConfirm} disabled={busy || confirmDisabled}>{confirmLabel}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
