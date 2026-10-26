<script lang="ts" module>
	import type { ClassValue } from '$lib/utils';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	export type ButtonVariant = 'default' | 'destructive' | 'destructive-confirm' | 'outline' | 'secondary' | 'ghost' | 'link';
	export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

	const variants: Record<ButtonVariant, string> = {
		'default': 'border border-primary bg-primary text-primary-foreground enabled:hover:bg-primary-hover enabled:active:bg-primary-pressed',
		'destructive': 'border border-destructive bg-card text-destructive enabled:hover:bg-destructive-soft enabled:active:bg-card enabled:active:shadow-[inset_0_0_0_1px_currentColor]',
		'destructive-confirm': 'border border-destructive bg-destructive text-destructive-foreground enabled:hover:bg-destructive-hover enabled:active:bg-destructive-pressed',
		'outline': 'border border-primary bg-card text-primary enabled:hover:bg-sky-soft enabled:active:bg-background',
		'secondary': 'border border-primary bg-card text-primary enabled:hover:bg-sky-soft enabled:active:bg-background',
		'ghost': 'bg-transparent text-foreground enabled:hover:bg-background enabled:active:bg-sky-soft',
		'link': 'text-primary underline-offset-4 enabled:hover:underline focus-visible:underline',
	};

	const sizes: Record<ButtonSize, string> = {
		default: 'min-h-11 px-4 py-2',
		sm: 'min-h-11 px-4 py-2',
		lg: 'min-h-11 px-4 py-2',
		icon: 'min-h-11 min-w-11 p-2',
	};

	export function buttonVariants({
		variant = 'default',
		size = 'default',
		class: className,
		busy = false,
	}: {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: ClassValue;
		busy?: boolean;
	} = {}) {
		return cn(
			'control-focus inline-flex max-w-full [overflow-wrap:anywhere] items-center justify-center gap-2 whitespace-normal rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
			variants[variant],
			!busy && 'disabled:bg-border disabled:text-muted-foreground disabled:border-border',
			sizes[size],
			className,
			'min-h-11 min-w-11 rounded-full text-sm',
			size === 'icon' && 'min-w-11',
		);
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LoaderCircle } from '$lib/icons';

	const {
		class: className,
		'aria-busy': ariaBusy,
		pendingLabel,
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
		pendingLabel?: string;
	} = $props();
	const pending = $derived(ariaBusy === true || ariaBusy === 'true');
</script>

<button
	{type}
	disabled={disabled || pending}
	aria-busy={ariaBusy}
	{onclick}
	class={buttonVariants({ variant, size, class: className, busy: pending })}
	{...restProps}
>
	{#if pendingLabel}
		<span class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)]">
			<span class="col-start-1 row-start-1 inline-flex min-w-0 items-center justify-center gap-2" class:invisible={pending} aria-hidden={pending ? 'true' : undefined}>{@render children?.()}</span>
			<span class="col-start-1 row-start-1 inline-flex min-w-0 items-center justify-center gap-2" class:invisible={!pending} aria-hidden={!pending ? 'true' : undefined}><LoaderCircle class="motion-safe:animate-spin" aria-hidden="true" />{pendingLabel}</span>
		</span>
	{:else}{@render children?.()}{/if}
</button>
