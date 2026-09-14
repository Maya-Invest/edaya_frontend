<script lang="ts">
	import type { ToastKind } from '$lib/toast.svelte';
	import { CheckCircle2, Info, X, XCircle } from '$lib/icons';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';

	const tone: Record<ToastKind, string> = {
		success: 'border-success/30 bg-success-soft text-foreground',
		error: 'border-destructive/30 bg-destructive/10 text-foreground',
		info: 'border-border bg-card text-foreground',
	};

	const Icon: Record<ToastKind, typeof Info> = {
		success: CheckCircle2,
		error: XCircle,
		info: Info,
	};
</script>

<div
	class="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm sm:bottom-6 sm:right-6 flex-col gap-2"
	aria-live="polite"
>
	{#each toast.items as item (item.id)}
		{@const ItemIcon = Icon[item.kind]}
		<div
			class={cn(
				'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-panel animate-fade-in',
				tone[item.kind],
			)}
			role="status"
		>
			<ItemIcon class="mt-0.5 h-4 w-4 shrink-0" />
			<p class="min-w-0 flex-1 text-sm">{item.message}</p>
			<button
				type="button"
				class="rounded-full p-0.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
				aria-label="Close"
				onclick={() => toast.dismiss(item.id)}
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</div>
	{/each}
</div>
