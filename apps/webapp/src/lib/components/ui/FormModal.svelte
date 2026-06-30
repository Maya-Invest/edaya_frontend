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
		onSubmit: () => void | Promise<void>;
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
		<div class="space-y-4 py-2">
			{@render children?.()}
		</div>
		<Dialog.Footer>
			<Button variant="ghost" onclick={close} disabled={busy}>{cancelLabel}</Button>
			<Button onclick={onSubmit} disabled={busy || submitDisabled}>{submitLabel}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
