<script lang="ts">
	import type { Snippet } from 'svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';

	interface Props {
		title: string;
		subtitle?: string;
		children: Snippet;
		footer?: Snippet;
	}

	const { title, subtitle, children, footer }: Props = $props();
</script>

<div class="flex min-h-screen flex-col bg-background text-foreground">
	<header class="flex items-center justify-end gap-3 border-b border-border bg-card/60 px-6 py-4 backdrop-blur">
		<LanguageSelector />
	</header>

	<main class="flex flex-1 items-center justify-center p-6">
		<div class="w-full max-w-lg animate-fade-in">
			<div class="mb-8 flex flex-col items-center text-center">
				<BrandLogo variant="horizontal" width={144} />
				<h1 class="font-display text-3xl font-semibold">{title}</h1>
				{#if subtitle}
					<p class="mt-2 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
				{/if}
			</div>

			<section class="rounded-collection border border-border bg-card p-5 shadow-soft">
				{@render children()}
			</section>

			{#if footer}
				<div class="mt-6 text-center text-sm">
					{@render footer()}
				</div>
			{/if}
		</div>
	</main>
</div>
