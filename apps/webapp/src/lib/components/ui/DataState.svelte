<script lang="ts">
	import type { PageLoadState } from '$lib/page/load-state';
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { AlertCircle, Inbox } from '$lib/icons';

	const {
		status,
		errorMessage,
		emptyTitle,
		emptyDescription,
		preserveShell = false,
		children,
	}: {
		status: PageLoadState;
		errorMessage?: string;
		emptyTitle?: string;
		emptyDescription?: string;
		/** Keep list shell (header + CTA) visible when the collection is empty. */
		preserveShell?: boolean;
		children?: Snippet;
	} = $props();

	function retry() {
		if (typeof window !== 'undefined')
			window.location.reload();
	}
</script>

{#if status === 'error'}
	<div
		class="flex min-h-[40vh] items-center justify-center p-8 animate-fade-in"
		role="alert"
	>
		<div
			class="max-w-md rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-soft"
		>
			<AlertCircle class="mx-auto mb-3 h-8 w-8 text-destructive" />
			<h2 class="font-display text-lg font-semibold">{$t('dataState.errorTitle')}</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				{errorMessage ?? $t('dataState.errorDefault')}
			</p>
			<Button class="mt-5 rounded-full" variant="outline" onclick={retry}>
				{$t('dataState.retry')}
			</Button>
		</div>
	</div>
{:else if status === 'empty' && !preserveShell}
	<div class="flex min-h-[40vh] items-center justify-center p-8 animate-fade-in">
		<div class="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
			<Inbox class="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
			<h2 class="font-display text-lg font-semibold">
				{emptyTitle ?? $t('dataState.emptyTitle')}
			</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				{emptyDescription ?? $t('dataState.emptyDescription')}
			</p>
		</div>
	</div>
{:else}
	{@render children?.()}
{/if}
