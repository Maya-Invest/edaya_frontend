<script lang="ts">
	import { cn } from '$lib/utils';
	import { Popover as PopoverPrimitive } from 'bits-ui';

	const {
		class: className,
		align = 'center',
		children,
		zIndex = 50,
		...restProps
	}: Omit<PopoverPrimitive.ContentProps, 'child'> & { zIndex?: number } = $props();
</script>

<PopoverPrimitive.Portal>
	<PopoverPrimitive.Content
		{align}
		class={cn(
			'ui-popover z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out',
			className,
		)}
		{...restProps}
	>
		{#snippet child({ props, wrapperProps })}
			<!-- Keep the positioned layer stable when a popup reopens before Bits' measurement frame. -->
			<div {...wrapperProps} style:z-index={zIndex}>
				<div {...props}>{@render children?.()}</div>
			</div>
		{/snippet}
	</PopoverPrimitive.Content>
</PopoverPrimitive.Portal>
