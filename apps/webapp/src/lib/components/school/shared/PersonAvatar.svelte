<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import { observePortrait } from '$lib/api/portrait-visibility';
	import { loadPrivateImage } from '$lib/api/private-image';
	import { authSession } from '$lib/auth/session.svelte';
	import { cn } from '$lib/utils';

	const {
		name,
		initials,
		photoUrl = null,
		studentPortrait,
		size = 'list',
		class: className = '',
	}: {
		name: string;
		initials: string;
		photoUrl?: string | null;
		studentPortrait?: { studentId: string; attachmentId: string };
		size?: 'xs' | 'sm' | 'md' | 'list' | 'lg' | 'studentHeader';
		class?: string;
	} = $props();

	const source = $derived(photoUrl);
	let element = $state<HTMLElement>();
	let visible = $state(false);
	$effect(() => {
		const target = element;
		if (!target || !source)
			return;
		visible = false;
		return observePortrait(target, (intersecting) => {
			visible = intersecting;
		});
	});
	let imageSource = $state<string | null>(null);
	$effect(() => {
		imageSource = null;
		void academicContext.scopeGeneration;
		void authSession.authUserId;
		void authSession.grants;
		if (!source || !visible)
			return;
		const controller = new AbortController();
		let dispose = () => {};
		void loadPrivateImage(source, controller.signal, studentPortrait).then((image) => {
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
			studentHeader: 'h-[70px] w-[70px] rounded-full text-xl',
			lg: 'h-14 w-14 rounded-lg text-lg',
		}[size],
	);
</script>

<div
	bind:this={element}
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
