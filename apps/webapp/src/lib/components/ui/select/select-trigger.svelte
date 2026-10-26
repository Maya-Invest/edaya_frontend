<script lang="ts">
	import { ChevronDown } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { Select as SelectPrimitive } from 'bits-ui';

	const { class: className, children, ...restProps }: SelectPrimitive.TriggerProps = $props();
</script>

<SelectPrimitive.Trigger {...restProps}>
	{#snippet child({ props })}
		<button
			{...props}
			type="button"
			class={cn(
				'control-focus flex min-h-11 w-full appearance-none items-center justify-between rounded-full border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 [&>span]:whitespace-normal',
				className,
			)}
		>
			{@render children?.()}
			<ChevronDown class="h-4 w-4 opacity-50" />
		</button>
	{/snippet}
</SelectPrimitive.Trigger>
