<script lang="ts">
	import type { Lang } from '$lib/i18n';
	import { lang, setLang, t } from '$lib/i18n';
	import { Check, ChevronDown, Languages } from '$lib/icons';
	import { cn } from '$lib/utils';

	const OPTIONS: { value: Lang; flag: string; labelKey: string; short: string }[] = [
		{ value: 'en', flag: '🇬🇧', labelKey: 'lang.english', short: 'EN' },
		{ value: 'fr', flag: '🇫🇷', labelKey: 'lang.french', short: 'FR' },
	];

	let open = $state(false);
	let ref = $state<HTMLDivElement | null>(null);

	const current = $derived(OPTIONS.find(o => o.value === $lang)!);

	$effect(() => {
		if (!open)
			return;
		const onClick = (e: MouseEvent) => {
			if (ref && !ref.contains(e.target as Node))
				open = false;
		};
		document.addEventListener('mousedown', onClick);
		return () => document.removeEventListener('mousedown', onClick);
	});
</script>

<div bind:this={ref} class="relative">
	<button
		type="button"
		data-testid="language-selector"
		onclick={() => (open = !open)}
		title={$t('lang.label')}
		class={cn(
			'flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium transition',
			open ? 'bg-secondary text-foreground' : 'text-foreground/80 hover:text-foreground',
		)}
	>
		<Languages class="h-3.5 w-3.5 text-muted-foreground" />
		<span class="font-mono">{current.short}</span>
		<ChevronDown class={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
	</button>
	{#if open}
		<div
			class="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-panel animate-fade-in"
		>
			{#each OPTIONS as o (o.value)}
				{@const selected = o.value === $lang}
				<button
					type="button"
					data-testid={`language-option-${o.value}`}
					onclick={() => {
						setLang(o.value);
						open = false;
					}}
					class={cn(
						'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/60',
						selected && 'bg-primary/5',
					)}
				>
					<span class="flex items-center gap-2">
						<span class="text-base leading-none">{o.flag}</span>
						<span>{$t(o.labelKey)}</span>
					</span>
					{#if selected}<Check class="h-3.5 w-3.5 text-accent" />{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
