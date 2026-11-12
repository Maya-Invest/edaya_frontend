<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t } from '$lib/i18n';
	import { X } from '$lib/icons';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { focusInvalidField, formValues } from '$lib/interaction/form-values';
	import { cn } from '$lib/utils';
	import { onDestroy, tick } from 'svelte';

	let {
		open = $bindable(false),
		title,
		description,
		submitLabel = $t('common.save'),
		cancelLabel = $t('common.cancel'),
		busy = false,
		dirty,
		retainsDraft,
		navigation,
		presentation = 'form',
		submitDisabled = false,
		contentClass,
		bodyClass,
		children,
		footer,
		onCloseAutoFocus,
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
		dirty?: boolean;
		retainsDraft?: (destination: URL) => boolean;
		navigation?: Snippet;
		presentation?: 'form' | 'task' | 'assistant';
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
		onCloseAutoFocus?: (event: Event) => void;
		onCancel?: () => void;
		onOpenChange?: (open: boolean) => void;
		onSubmit: () => void | Promise<void>;
	} = $props();

	const dirtyWork = getDirtyWork();
	let form = $state<HTMLFormElement>();
	const headingId = $props.id();
	function focusEditable() {
		const field = form?.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), button[aria-haspopup=listbox]:not([disabled]), [contenteditable=true]');
		if (field && field.getClientRects().length)
			field.focus();
		else document.getElementById(headingId)?.focus();
	}
	$effect(() => {
		if (!form)
			return;
		const observer = new MutationObserver(() => {
			if (document.activeElement?.id === headingId)
				focusEditable();
		});
		observer.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'readonly'] });
		return () => observer.disconnect();
	});
	let changed = $state(false);
	let ignoredDraft = $state(false);
	let submitting = $state(false);
	let baseline = '';
	let baselineReady = false;
	let composing = false;
	let validationMessage = $state('');
	const pending = $derived(busy || submitting);
	$effect(() => {
		if (open) {
			changed = false;
			baselineReady = false;
			ignoredDraft = false;
			validationMessage = '';
			void tick().then(() => {
				if (form) {
					baseline = formValues(form);
					baselineReady = Boolean(form.querySelector('input:not([type=hidden]),textarea,[aria-haspopup=listbox]'));
				}
			});
		}
	});
	const unregister = dirtyWork?.register({
		retainsDraft: destination => retainsDraft?.(destination) ?? false,
		isDirty: () => open && !ignoredDraft && (dirty ?? changed),
		discard: () => {
			ignoredDraft = true;
			changed = false;
		},
	});
	onDestroy(() => unregister?.());
	function recordBaseline() {
		if (form && !changed && !baselineReady) {
			baseline = formValues(form);
			baselineReady = true;
		}
	}
	function recordChange() {
		void tick().then(() => {
			if (form) {
				changed = formValues(form) !== baseline;
				ignoredDraft = false;
				for (const field of form.querySelectorAll<HTMLInputElement>('[aria-invalid="true"]')) {
					if (field.validity?.valid)
						field.removeAttribute('aria-invalid');
				}
			}
		});
	}
	function finishClose() {
		onCancel?.();
		open = false;
		onOpenChange?.(false);
	}
	function close() {
		if (pending && presentation === 'form')
			return;
		if (dirtyWork)
			dirtyWork.request(finishClose);
		else finishClose();
	}
	function handleOpenChange(next: boolean) {
		if (!next) {
			close();
		}
		else {
			open = true;
			onOpenChange?.(true);
		}
	}
	async function submit() {
		if (pending || submitDisabled)
			return;
		validationMessage = '';
		if (form && !form.checkValidity()) {
			validationMessage = $t('form.invalid');
			focusInvalidField(form);
			return;
		}
		submitting = true;
		try {
			await onSubmit();
		}
		finally {
			submitting = false;
		}
	}

</script>

<Dialog.Root bind:open={() => open, handleOpenChange}>
	{#if open}
		<Dialog.Content
			data-testid="form-modal"
			{onCloseAutoFocus}
			onOpenAutoFocus={async (event) => {
				event.preventDefault();
				await tick();
				focusEditable();
			}}
			onEscapeKeydown={(event) => {
				event.preventDefault();
				close();
			}}
			onInteractOutside={(event) => {
				event.preventDefault();
				close();
			}}
			class={cn('flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col gap-4 p-4', contentClass, presentation === 'assistant' && 'assistant-shell', presentation === 'task' && 'inset-0 h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none')}
		>
			<div class="max-h-[35dvh] shrink-0 space-y-4 overflow-y-auto">
				<Dialog.Header>
					<div class="flex items-start justify-between gap-4 text-left"><Dialog.Title id={headingId} tabindex={-1} class="min-w-0 flex-1 break-words">{title}</Dialog.Title>
						{#if presentation !== 'form'}<Button class="shrink-0" variant="ghost" size="icon" aria-label={$t('common.close')} onclick={close}><X aria-hidden="true" /></Button>{/if}
					</div>
				</Dialog.Header>
				{#if navigation && presentation !== 'assistant'}<div>{@render navigation()}</div>{/if}
			</div>
			<!-- IME Enter must never trigger an implicit form submit. -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<form bind:this={form} class="flex min-h-0 flex-1 flex-col gap-4" novalidate
				onsubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
				onkeydown={(event) => {
					if (event.key === 'Enter' && (event.isComposing || composing || event.keyCode === 229))
						event.preventDefault();
				}}
				oncompositionstart={() => composing = true} oncompositionend={() => composing = false}
				onfocusin={recordBaseline} oninput={recordChange} onchange={recordChange} onreset={recordChange}>
				<div class:assistant-work={presentation === 'assistant'} class="min-h-0 flex flex-1 flex-col">
					{#if navigation && presentation === 'assistant'}<aside class="assistant-navigation">{@render navigation()}</aside>{/if}
					<div class={cn('scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2', bodyClass)}>
						{#if description}<Dialog.Description class="break-words">{description}</Dialog.Description>{/if}
						{@render children?.()}
					</div>
				</div>
				{#if validationMessage}<p role="alert" class="text-sm text-destructive">{validationMessage}</p>{/if}
				<Dialog.Footer class={cn(presentation === 'assistant' && 'border-t px-6 py-4', 'max-h-[25dvh] shrink-0 overflow-y-auto')}>
					{#if footer}
						{@render footer({ close, submit, busy: pending, submitDisabled })}
					{:else}
						<Button variant="outline" data-testid="form-modal-cancel" onclick={close} disabled={pending}>{cancelLabel}</Button>
						<Button data-testid="form-modal-submit" type="submit" pendingLabel={$t('form.saving')} aria-busy={pending} disabled={pending || submitDisabled}>{submitLabel}</Button>
					{/if}
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	{/if}
</Dialog.Root>

<style>
 :global(.ui-dialog.assistant-shell) { width:calc(100% - 32px); max-width:900px; height:calc(100dvh - 32px); max-height:calc(100dvh - 32px); border-radius:12px; gap:0; padding:0; overflow:clip; }
 :global(.assistant-shell)>div:first-child { padding:20px 24px; border-bottom:1px solid hsl(var(--border)); }
 :global(.assistant-shell) form { gap:0; }
 :global(.assistant-shell) .assistant-work>div:last-child { padding:24px; min-width:0; }

 .assistant-navigation { padding:12px; border-bottom:1px solid hsl(var(--border)); background:hsl(var(--secondary)); }
 @media(min-width:1024px) { :global(.ui-dialog.assistant-shell) { width:calc(100% - 64px); height:calc(100dvh - 64px); max-height:calc(100dvh - 64px); } .assistant-work { flex-direction:column; } .assistant-navigation { flex-shrink:0; overflow:auto; } .assistant-navigation :global(ol) { flex-direction:row; } .assistant-navigation :global(nav) { max-height:none; } }
 @media(max-width:767px) {
 :global(.assistant-shell)>div:first-child { padding:16px; }
 :global(.assistant-shell) .assistant-work>div:last-child { padding:16px; }
 .assistant-navigation :global(ol) { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
 .assistant-navigation :global(.ui-nav-target) { width:100%; font-size:.75rem; padding:8px; }
 :global(.ui-dialog.assistant-shell .ui-dialog-footer) { flex-direction:row; flex-wrap:wrap; padding:12px 16px; }
 :global(.ui-dialog.assistant-shell .ui-dialog-footer > button) { width:auto; }
 }
</style>
