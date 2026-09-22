<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { t } from '$lib/i18n';
	import { hasAnyPermission } from '$lib/permissions';
	import { cn } from '$lib/utils';
	import { OTHER_CONFIG_ENTRIES } from './lib/other-config-catalog';

	const { children }: { children: Snippet } = $props();

	const visibleEntries = $derived(
		OTHER_CONFIG_ENTRIES.filter(entry => hasAnyPermission(entry.permissions)),
	);
</script>

<div class="flex min-h-0 flex-col gap-6 lg:flex-row lg:items-start">
	<aside class="w-full shrink-0 lg:w-56">
		<nav
			aria-label={$t('config.other')}
			class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
		>
			{#each visibleEntries as entry (entry.key)}
				<a
					href={resolve(entry.href)}
					aria-current={$page.url.pathname.startsWith(entry.href) ? 'page' : undefined}
					class={cn(
						'block px-4 py-3 text-sm transition-colors hover:bg-secondary/60',
						$page.url.pathname.startsWith(entry.href) && 'bg-primary/10 font-medium text-foreground',
					)}
				>
					{$t(entry.labelKey)}
				</a>
			{/each}
		</nav>
	</aside>
	<div class="min-w-0 flex-1">
		{@render children()}
	</div>
</div>
