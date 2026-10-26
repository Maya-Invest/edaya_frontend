<script lang="ts">
	import type { PasswordlessPanelState } from '$lib/smart-components/passwordless-panel/passwordless-panel-state.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t } from '$lib/i18n';

	const { flow, disabled = false, onRetry }: { flow: PasswordlessPanelState; disabled?: boolean; onRetry: () => void } = $props();

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
			{#if document.status === 'draft'}<p role="status" class="text-muted-foreground">{$t('auth.termsDraft')}</p>{/if}
			<Dialog.Root bind:open={flow.termsDialogOpen}>
				<Dialog.Trigger type="button" data-testid="auth-terms-read" class={buttonVariants({ variant: 'link', class: 'px-0 text-left' })} {disabled}>{$t('auth.termsRead')}</Dialog.Trigger>
				<Dialog.Content data-testid="auth-terms-dialog" class="flex flex-col overflow-hidden rounded-xl" aria-describedby={undefined}>
					<Dialog.Header class="shrink-0 text-left">
						<Dialog.Title class="min-w-0 break-words">{document.title}</Dialog.Title>
					</Dialog.Header>
					<!-- The scrollable reading region needs keyboard focus for Page Up/Down and arrow keys. -->
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<div class="control-focus min-h-0 space-y-4 overflow-y-auto break-words text-sm leading-relaxed" data-testid="auth-terms-content" role="region" aria-label={document.title} tabindex="0">
						{#if document.status === 'draft'}<p class="text-muted-foreground">{$t('auth.termsDraft')}</p>{/if}
						{#each document.sections as section, index (index)}
							<section class="space-y-2">
								<h2 class="font-semibold">{section.heading}</h2>
								{#each section.paragraphs as paragraph, paragraphIndex (paragraphIndex)}<p>{paragraph}</p>{/each}
							</section>
						{/each}
					</div>
					<Dialog.Footer class="shrink-0 flex-col">
						<Button data-testid="auth-terms-close" variant="ghost" onclick={() => flow.termsDialogOpen = false}>{$t('common.close')}</Button>
						<Button data-testid="auth-terms-confirm" {disabled} onclick={acceptTerms}>{$t('auth.termsConfirm')}</Button>
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
