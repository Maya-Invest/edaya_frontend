<script lang="ts">
	import { cn } from '$lib/utils';
	import { Popover as PopoverPrimitive } from 'bits-ui';

	const {
		class: className,
		align = 'center',
		children,
		...restProps
	}: PopoverPrimitive.ContentProps = $props();
</script>

<PopoverPrimitive.Portal>
	<PopoverPrimitive.Content
		{align}
		class={cn(
			'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out',
			className,
		)}
		{...restProps}
	>
		{@render children?.()}
	</PopoverPrimitive.Content>
</PopoverPrimitive.Portal>
