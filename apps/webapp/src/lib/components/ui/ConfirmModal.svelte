<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t } from '$lib/i18n';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = $t('common.confirm'),
		cancelLabel = $t('common.cancel'),
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

	let submitting = $state(false);
	const pending = $derived(busy || submitting);
	async function confirm() {
		if (pending || confirmDisabled)
			return;
		submitting = true;
		try {
			await onConfirm();
		}
		finally {
			submitting = false;
		}
	}
	function handleOpenChange(next: boolean) {
		if (!next && pending)
			return;
		open = next;
		if (!next) {
			onOpenChange?.(false);
		}
	}

	function close() {
		if (pending)
			return;
		onCancel?.();
		handleOpenChange(false);
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	{#if open}
		<Dialog.Content data-testid="confirm-modal" class="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				{#if description}
					<Dialog.Description>{description}</Dialog.Description>
				{/if}
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="ghost" onclick={close} disabled={pending}>{cancelLabel}</Button>
				<Button variant={variant === 'destructive' ? 'destructive-confirm' : variant} onclick={confirm} aria-busy={pending} disabled={pending || confirmDisabled}>{confirmLabel}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
