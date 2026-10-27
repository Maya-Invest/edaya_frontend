<script lang="ts">
	import { loadPrivateImage } from '$lib/api/private-image';
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

	let imageSource = $state<string | null>(null);
	$effect(() => {
		const source = photoUrl;
		imageSource = null;
		if (!source)
			return;
		const controller = new AbortController();
		let dispose = () => {};
		void loadPrivateImage(source, controller.signal).then((image) => {
			if (controller.signal.aborted) {
				image.dispose();
				return;
			}
			dispose = image.dispose;
			imageSource = image.url;
		}).catch(() => {});
		return () => {
			controller.abort();
			dispose();
		};
	});

	const sizeClass = $derived(
		{
			xs: 'h-5 w-5 rounded-full text-[9px]',
			sm: 'h-6 w-6 rounded-full text-[10px]',
			md: 'h-7 w-7 rounded-full text-[11px]',
			list: 'h-10 w-10 rounded-lg text-sm',
			lg: 'h-14 w-14 rounded-lg text-lg',
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
	{#if imageSource}
		<img
			src={imageSource}
			alt={name}
			loading="lazy"
			decoding="async"
			class="h-full w-full object-cover"
		/>
	{:else}
		<span>{initials}</span>
	{/if}
</div>
