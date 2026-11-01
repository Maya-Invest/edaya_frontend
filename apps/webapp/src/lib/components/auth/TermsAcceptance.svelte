<script lang="ts">
	import type { PasswordlessPanelState } from '$lib/smart-components/passwordless-panel/passwordless-panel-state.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t } from '$lib/i18n';
	import { onDestroy } from 'svelte';
	import { prepareTermsReader, termsReaderHtml } from './terms-reader';

	const { flow, disabled = false, onRetry }: { flow: PasswordlessPanelState; disabled?: boolean; onRetry: () => void } = $props();

	const id = $props.id();
	let cleanupReader = () => {};
	onDestroy(() => cleanupReader());

	function readerLoaded(event: Event) {
		cleanupReader();
		const frame = event.currentTarget as HTMLIFrameElement;
		cleanupReader = prepareTermsReader(frame, () => flow.termsDialogOpen = false, () => frame.ownerDocument.getElementById(`${id}-close`)?.focus(), () => frame.ownerDocument.getElementById(`${id}-accept`)?.focus());
	}

	function acceptTerms() {
		if (disabled)
			return;
		flow.termsAccepted = true;
		flow.termsDialogOpen = false;
	}
</script>

{#if flow.termsLoading || flow.termsLoadError || flow.terms?.document}
	<div class="space-y-3 text-sm" data-testid="auth-terms">
		{#if flow.termsLoading}
			<p role="status" class="text-muted-foreground">{$t('auth.termsLoading')}</p>
		{:else if flow.termsLoadError}
			<p role="alert" class="text-destructive">{$t('auth.termsUnavailable')}</p>
			<Button type="button" variant="outline" onclick={onRetry} {disabled}>{$t('auth.termsRetry')}</Button>
		{:else if flow.terms?.document}
			{@const document = flow.terms.document}
			<Dialog.Root bind:open={flow.termsDialogOpen}>
				<Dialog.Trigger type="button" data-testid="auth-terms-read" class={buttonVariants({ variant: 'link', class: 'px-0 text-left' })} {disabled}>{$t('auth.termsRead')}</Dialog.Trigger>
				<Dialog.Content data-testid="auth-terms-dialog" class="flex h-[min(85dvh,calc(100dvh-2rem))] max-w-4xl flex-col overflow-hidden rounded-collection" aria-describedby={undefined}>
					<Dialog.Header class="shrink-0 text-left">
						<Dialog.Title class="min-w-0 break-words">{document.title}</Dialog.Title>
					</Dialog.Header>
					<iframe
						class="control-focus min-h-0 w-full flex-1 border-0 text-sm text-foreground"
						data-testid="auth-terms-content"
						title={document.title}
						sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
						srcdoc={termsReaderHtml(document)}
						onload={readerLoaded}
					></iframe>
					<Dialog.Footer class="shrink-0 flex-col">
						<Button id={`${id}-close`} data-testid="auth-terms-close" variant="ghost" onclick={() => flow.termsDialogOpen = false}>{$t('common.close')}</Button>
						<Button id={`${id}-accept`} data-testid="auth-terms-confirm" {disabled} onclick={acceptTerms}>{$t('auth.termsConfirm')}</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
			{#if flow.terms.enforced}
				<label class="flex min-h-12 cursor-pointer items-start gap-3 py-3">
					<input data-testid="auth-terms-accept" type="checkbox" class="control-focus mt-0.5 size-4 shrink-0 accent-primary" bind:checked={flow.termsAccepted} {disabled} required />
					<span>{$t('auth.termsAccept')}</span>
				</label>
			{/if}
		{/if}
	</div>
{/if}
