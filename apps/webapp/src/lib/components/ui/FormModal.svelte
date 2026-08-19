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
		bodyClass,
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
		bodyClass?: string;
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
	<Dialog.Content
		data-testid="form-modal"
		class={cn('flex max-h-[min(90dvh,44rem)] w-full max-w-lg flex-col gap-4', contentClass)}
	>
		<Dialog.Header class="shrink-0">
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<div class={cn('scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto py-2', bodyClass)}>
			{@render children?.()}
		</div>
		<Dialog.Footer class="shrink-0">
			{#if footer}
				{@render footer({ close, submit: onSubmit, busy, submitDisabled })}
			{:else}
				<Button variant="ghost" data-testid="form-modal-cancel" onclick={close} disabled={busy}>{cancelLabel}</Button>
				<Button data-testid="form-modal-submit" onclick={onSubmit} disabled={busy || submitDisabled}>{submitLabel}</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
