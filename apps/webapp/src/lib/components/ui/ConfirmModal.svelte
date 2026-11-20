<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t } from '$lib/i18n';
	import { tick } from 'svelte';

	let {
		open = $bindable(false),
		title,
		description,
		target,
		children,
		errorMessage,
		confirmLabel = $t('common.confirm'),
		cancelLabel = $t('common.cancel'),
		busy = false,
		confirmDisabled = false,
		variant = 'destructive',
		onCancel,
		onOpenChange,
		onCloseAutoFocus,
		onConfirm,
	}: {
		open?: boolean;
		title: string;
		description?: string;
		target?: string;
		children?: Snippet;
		errorMessage?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		busy?: boolean;
		confirmDisabled?: boolean;
		variant?: 'default' | 'destructive';
		onCancel?: () => void;
		onOpenChange?: (open: boolean) => void;
		onCloseAutoFocus?: (event: Event) => void;
		onConfirm: () => void | Promise<void>;
	} = $props();

	const cancelId = $props.id();
	let failure = $state('');
	let submitting = $state(false);
	$effect(() => {
		if (open)
			failure = '';
	});
	const pending = $derived(busy || submitting);
	async function confirm() {
		if (pending || confirmDisabled)
			return;
		submitting = true;
		failure = '';
		try {
			await onConfirm();
		}
		catch {
			failure = $t('confirmation.failed');
		}
		finally {
			submitting = false;
		}
	}
	function handleOpenChange(next: boolean) {
		if (!next && pending)
			return;
		if (onOpenChange)
			onOpenChange(next);
		else
			open = next;
	}

	function close() {
		if (pending)
			return;
		onCancel?.();
		handleOpenChange(false);
	}
</script>

<Dialog.Root bind:open={() => open, handleOpenChange}>
	{#if open}
		<Dialog.Content {onCloseAutoFocus} data-testid="confirm-modal" class="flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col overflow-hidden" onOpenAutoFocus={async (event) => {
			event.preventDefault();
			await tick();
			document.getElementById(cancelId)?.focus();
		}} onEscapeKeydown={(event) => {
			event.preventDefault();
			close();
		}} onInteractOutside={(event) => {
			event.preventDefault();
			close();
		}}>
			<Dialog.Header class="shrink-0"><Dialog.Title>{title}</Dialog.Title></Dialog.Header>
			<div class="min-h-0 space-y-4 overflow-y-auto" aria-busy={pending}>
				{#if target}<p class="break-words text-sm font-semibold">{target}</p>{/if}
				{#if description}<Dialog.Description>{description}</Dialog.Description>{/if}
				{@render children?.()}
				{#if failure || errorMessage}<p role="alert" class="text-sm text-destructive">{errorMessage || failure}</p>{/if}
			</div>
			<Dialog.Footer class="shrink-0 border-t pt-4">
				<Button id={cancelId} data-testid="confirm-cancel" variant="outline" onclick={close} disabled={pending}>{cancelLabel}</Button>
				<Button data-testid="confirm-submit" variant={variant === 'destructive' ? 'destructive-confirm' : variant} onclick={confirm} pendingLabel={$t('confirmation.pending')} aria-busy={pending} disabled={pending || confirmDisabled}>{confirmLabel}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
