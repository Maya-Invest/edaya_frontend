<script lang="ts">
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { navItems } from '$lib/config/navigation';
	import { cn } from '$lib/utils/cn';
	import { Building2, LayoutDashboard } from 'lucide-svelte';
	import '../app.css';

	const { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Edaya Admin</title>
</svelte:head>

<div class="flex min-h-screen bg-background">
	<aside class="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
		<div class="flex items-center gap-3 border-b border-border px-5 py-5">
			<div class="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
				<Building2 class="size-5" />
			</div>
			<div>
				<p class="font-display text-lg font-semibold leading-tight">Edaya</p>
				<p class="text-xs text-muted-foreground">Webadmin</p>
			</div>
		</div>

		<nav class="flex flex-1 flex-col gap-1 p-3">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class={cn(
						'rounded-lg px-3 py-2.5 transition-colors',
						page.url.pathname === item.href
							? 'bg-primary text-primary-foreground shadow-soft'
							: 'text-foreground hover:bg-muted',
					)}
				>
					<span class="block text-sm font-medium">{item.label}</span>
					<span
						class={cn(
							'block text-xs',
							page.url.pathname === item.href ? 'text-primary-foreground/80' : 'text-muted-foreground',
						)}
					>
						{item.description}
					</span>
				</a>
			{/each}
		</nav>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<header class="flex items-center justify-between border-b border-border bg-card/80 px-4 py-4 backdrop-blur sm:px-6">
			<div class="flex items-center gap-3">
				<div class="flex size-9 items-center justify-center rounded-lg bg-muted lg:hidden">
					<LayoutDashboard class="size-4 text-muted-foreground" />
				</div>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform</p>
					<h1 class="font-display text-xl font-semibold">Platform administration</h1>
				</div>
			</div>
			<span class="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-muted-foreground">
				Starter shell
			</span>
		</header>

		<main class="flex-1 px-4 py-6 sm:px-6">
			{@render children()}
		</main>
	</div>
</div>
