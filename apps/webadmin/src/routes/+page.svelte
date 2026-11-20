<script lang="ts">
	import { placeholderCards } from '$lib/config/navigation';
</script>

<section class="mx-auto flex max-w-6xl flex-col gap-8">
	<div class="space-y-2">
		<h2 class="font-display text-3xl font-semibold tracking-tight">Overview</h2>
		<p class="max-w-2xl text-sm text-muted-foreground">
			Internal console for EDaya platform operators. Tenant management, billing, and support workflows
			will land here as the webadmin control plane grows.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		{#each placeholderCards as card (card.title)}
			<article class="rounded-xl border border-border bg-card p-5 shadow-soft">
				<p class="text-sm font-medium text-muted-foreground">{card.title}</p>
				<p class="mt-3 font-display text-4xl font-semibold">{card.value}</p>
				<p class="mt-2 text-xs text-muted-foreground">{card.hint}</p>
			</article>
		{/each}
	</div>

	<article class="rounded-xl border border-dashed border-border bg-muted/40 p-6">
		<h3 class="font-display text-lg font-semibold">Next steps</h3>
		<ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
			<li>Wire authentication for platform operators.</li>
			<li>Connect to the EDaya Core API for tenant and subscription data.</li>
			<li>Migrate the school webapp into this monorepo when ready.</li>
		</ul>
	</article>
</section>
