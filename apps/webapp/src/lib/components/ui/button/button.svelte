<script lang="ts" module>
	import type { ClassValue } from '$lib/utils';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
	export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

	const variants: Record<ButtonVariant, string> = {
		default: 'bg-primary text-primary-foreground hover:bg-primary/90',
		destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
		outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
		ghost: 'hover:bg-accent hover:text-accent-foreground',
		link: 'text-primary underline-offset-4 hover:underline',
	};

	const sizes: Record<ButtonSize, string> = {
		default: 'h-10 px-4 py-2',
		sm: 'h-9 rounded-md px-3',
		lg: 'h-11 rounded-md px-8',
		icon: 'h-10 w-10',
	};

	export function buttonVariants({
		variant = 'default',
		size = 'default',
		class: className,
	}: {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: ClassValue;
	} = {}) {
		return cn(
			'control-focus inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
			variants[variant],
			sizes[size],
			className,
		);
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		class: className,
		variant = 'default',
		size = 'default',
		type = 'button',
		disabled = false,
		onclick,
		children,
		...restProps
	}: HTMLButtonAttributes & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		children?: Snippet;
	} = $props();
</script>

<button
	{type}
	{disabled}
	{onclick}
	class={buttonVariants({ variant, size, class: className })}
	{...restProps}
>
	{@render children?.()}
</button>
