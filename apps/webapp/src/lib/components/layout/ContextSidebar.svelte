<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { LucideIcon } from '$lib/icons';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';

	type Item = {
		key: string;
		label: string;
		icon?: LucideIcon;
		badge?: string | number;
		href: ResolvedPathname;
	};

	const {
		title,
		subtitle = 'Module',
		items,
		header,
		footer,
	}: {
		title: string;
		subtitle?: string;
		items: Item[];
		header?: Snippet;
		footer?: Snippet;
	} = $props();

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(`${href}/`);
	}
</script>

<aside class="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card/60 backdrop-blur">
	<div class="px-5 pb-3 pt-6">
		<p class="font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">{subtitle}</p>
		<h2 class="font-display text-lg font-semibold leading-tight">{title}</h2>
	</div>

	{#if header}
		<div class="px-4 pb-3">
			{@render header()}
		</div>
	{/if}

	<nav class="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-3 pb-6">
		<ul class="mt-1 space-y-0.5">
			{#each items as it (it.key)}
				{@const active = isActive(it.href)}
				{@const Icon = it.icon}
				<li>
					<a
						href={it.href}
						class={cn(
							'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
							active ? 'bg-primary text-primary-foreground shadow-soft' : 'text-foreground/80 hover:bg-secondary',
						)}
					>
						<span class="flex min-w-0 items-center gap-2.5">
							{#if Icon}
								<Icon
									class={cn(
										'h-4 w-4 shrink-0',
										active ? 'text-accent' : 'text-muted-foreground group-hover:text-foreground',
									)}
								/>
							{:else}
								<span
									class={cn(
										'h-1.5 w-1.5 rounded-full transition',
										active ? 'bg-accent' : 'bg-border group-hover:bg-accent',
									)}
								></span>
							{/if}
							<span class="truncate">{it.label}</span>
						</span>
						{#if it.badge !== undefined}
							<span
								class={cn(
									'rounded-md px-1.5 py-0.5 font-sans tabular-nums text-[10px]',
									active ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-secondary text-muted-foreground',
								)}
							>
								{it.badge}
							</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	{#if footer}
		<div class="border-t border-border p-4">
			{@render footer()}
		</div>
	{/if}
</aside>
