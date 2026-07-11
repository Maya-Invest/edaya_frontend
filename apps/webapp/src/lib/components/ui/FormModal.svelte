<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cn } from '$lib/utils';

	let {
		open = $bindable(false),
		title,
		description,
		submitLabel = 'Enregistrer',
		cancelLabel = 'Annuler',
		busy = false,
		submitDisabled = false,
		contentClass,
		children,
		footer,
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
		contentClass?: string;
		children?: Snippet;
		footer?: Snippet<[{
			close: () => void;
			submit: () => void | Promise<void>;
			busy: boolean;
			submitDisabled: boolean;
		}]>;
		onCancel?: () => void;
		onOpenChange?: (open: boolean) => void;
		onSubmit: () => void | Promise<void>;
	} = $props();

	function handleOpenChange(next: boolean) {
		open = next;
		onOpenChange?.(next);
	}

	function close() {
		onCancel?.();
		handleOpenChange(false);
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content data-testid="form-modal" class={cn('max-w-lg', contentClass)}>
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
			{#if footer}
				{@render footer({ close, submit: onSubmit, busy, submitDisabled })}
			{:else}
				<Button variant="ghost" onclick={close} disabled={busy}>{cancelLabel}</Button>
				<Button onclick={onSubmit} disabled={busy || submitDisabled}>{submitLabel}</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
