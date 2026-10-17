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

<div class="lg:h-full">
	<div class="grid min-w-0 gap-6 lg:min-h-full lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-0">
		<aside class="min-w-0 lg:border-r lg:border-border lg:bg-card lg:p-5" aria-label={$t('config.configurations')}>
			<div class="space-y-4 lg:sticky lg:top-5">
				<h2 class="text-sm font-medium">{$t('config.configurations')}</h2>
				<nav
					aria-label={$t('config.other')}
					class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
				>
					{#each visibleEntries as entry (entry.key)}
						<a
							href={resolve(entry.href)}
							aria-current={$page.url.pathname.startsWith(entry.href) ? 'page' : undefined}
							class={cn(
								'control-focus block px-4 py-3 text-sm transition-colors hover:bg-secondary/60',
								$page.url.pathname.startsWith(entry.href) && 'bg-primary/10 font-medium text-foreground',
							)}
						>
							{$t(entry.labelKey)}
						</a>
					{/each}
				</nav>
			</div>
		</aside>
		<div class="min-w-0 lg:p-8">
			{@render children()}
		</div>
	</div>
</div>
