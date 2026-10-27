<script lang="ts">
	import type { PageLoadState } from '$lib/page/load-state';
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { AlertCircle, Inbox } from '$lib/icons';
	import { PAGE_QUERY_RETRY } from '$lib/queries/retry-context';
	import { getContext } from 'svelte';

	const {
		status,
		errorMessage,
		emptyTitle,
		emptyDescription,
		preserveShell = false,
		children,
		onRetry,
	}: {
		status: PageLoadState;
		errorMessage?: string;
		emptyTitle?: string;
		emptyDescription?: string;
		/** Keep list shell (header + CTA) visible when the collection is empty. */
		preserveShell?: boolean;
		children?: Snippet;
		onRetry?: () => void;
	} = $props();

	const inheritedRetry = getContext<(() => void) | undefined>(PAGE_QUERY_RETRY);
	const retry = $derived(onRetry ?? inheritedRetry);
</script>

{#if status === 'denied' || status === 'unavailable'}
	<div role="status" class="space-y-4 p-6"><h2 class="text-xl font-semibold">{$t(`dataState.${status}`)}</h2><p>{$t(`dataState.${status}Description`)}</p>{#if retry}<Button variant="outline" onclick={retry}>{$t('dataState.retry')}</Button>{/if}</div>
{:else if status === 'loading'}
	<p role="status" class="p-6">{$t('dataState.loading')}</p>
{:else if status === 'error'}
	<div
		class="flex min-h-[40vh] items-center justify-center p-8 animate-fade-in"
		role="alert"
	>
		<div
			class="max-w-md rounded-collection border border-destructive/20 bg-destructive/5 p-8 text-center shadow-soft"
		>
			<AlertCircle class="mx-auto mb-3 h-8 w-8 text-destructive" />
			<h2 class="font-display text-lg font-semibold">{$t('dataState.errorTitle')}</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				{errorMessage ?? $t('dataState.errorDefault')}
			</p>
			{#if retry}<Button class="mt-5" variant="outline" onclick={retry}>
				{$t('dataState.retry')}
			</Button>{/if}
		</div>
	</div>
{:else if (status === 'empty' || status === 'no-match') && !preserveShell}
	<div class="flex min-h-[40vh] items-center justify-center p-8 animate-fade-in">
		<div class="max-w-md rounded-collection border border-border bg-card p-8 text-center shadow-soft">
			<Inbox class="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
			<h2 class="font-display text-lg font-semibold">
				{emptyTitle ?? $t(status === 'no-match' ? 'dataState.noMatch' : 'dataState.emptyTitle')}
			</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				{emptyDescription ?? $t('dataState.emptyDescription')}
			</p>
		</div>
	</div>
{:else}
	{#if status === 'refreshing' || status === 'loading-more'}<p role="status" class="text-sm">{$t(status === 'refreshing' ? 'dataState.refreshing' : 'dataState.loadingMore')}</p>{/if}
	{@render children?.()}
{/if}
