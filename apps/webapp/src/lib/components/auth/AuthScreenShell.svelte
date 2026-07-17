<script lang="ts">
	import type { Snippet } from 'svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import { GraduationCap } from '$lib/icons';

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
				<div
					class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-panel"
				>
					<GraduationCap class="h-7 w-7" />
				</div>
				<p class="font-mono text-xs uppercase tracking-widest text-muted-foreground">EDAYA</p>
				<h1 class="font-display text-3xl font-semibold">{title}</h1>
				{#if subtitle}
					<p class="mt-2 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
				{/if}
			</div>

			<section class="rounded-2xl border border-border bg-card p-5 shadow-soft">
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
