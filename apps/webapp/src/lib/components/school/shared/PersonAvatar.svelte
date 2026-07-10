<script lang="ts">
	import { cn } from '$lib/utils';

	const {
		name,
		initials,
		photoUrl = null,
		size = 'list',
		class: className = '',
	}: {
		name: string;
		initials: string;
		photoUrl?: string | null;
		size?: 'xs' | 'sm' | 'md' | 'list' | 'lg';
		class?: string;
	} = $props();

	const sizeClass = $derived(
		{
			xs: 'h-5 w-5 rounded-full text-[9px]',
			sm: 'h-6 w-6 rounded-full text-[10px]',
			md: 'h-7 w-7 rounded-full text-[11px]',
			list: 'h-10 w-10 rounded-xl text-sm',
			lg: 'h-14 w-14 rounded-2xl text-lg',
		}[size],
	);
</script>

<div
	class={cn(
		'flex shrink-0 items-center justify-center overflow-hidden bg-primary font-display font-semibold text-primary-foreground',
		sizeClass,
		className,
	)}
	aria-label={photoUrl ? undefined : name}
>
	{#if photoUrl}
		<img
			src={photoUrl}
			alt={name}
			loading="lazy"
			decoding="async"
			class="h-full w-full object-cover"
		/>
	{:else}
		<span>{initials}</span>
	{/if}
</div>
