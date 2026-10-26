<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import type { Snippet } from 'svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, X } from '$lib/icons';

	const {
		definition,
		loading = false,
		onClose,
		children,
	}: {
		definition?: ReportCardDefinition;
		loading?: boolean;
		onClose: () => void;
		children: Snippet;
	} = $props();

</script>

<DrawerFrame {onClose} label={definition?.name ?? $t('reportCards.subtitle')}>
	<header class="flex items-center justify-between border-b border-border px-6 py-4">
		<span class="rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wider text-foreground/80">
			{$t('reportCards.subtitle')}
		</span>
		<button
			type="button"
			onclick={onClose}
			aria-label={$t('common.close')}
			class="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
		>
			<X class="h-4 w-4" />
		</button>
	</header>

	<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
		{#if loading || !definition}
			<div class="flex min-h-[12rem] items-center justify-center" role="status" aria-live="polite">
				<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
			</div>
		{:else}
			{@render children()}
		{/if}
	</div>
</DrawerFrame>
