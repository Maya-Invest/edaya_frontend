<script lang="ts">
	import { cn } from '$lib/utils';
	import { Select as SelectPrimitive } from 'bits-ui';

	const {
		class: className,
		children,
		...restProps
	}: SelectPrimitive.ContentProps = $props();
</script>

<SelectPrimitive.Portal>
	<SelectPrimitive.Content
		class={cn(
			'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out',
			className,
		)}
		{...restProps}
	>
		<SelectPrimitive.Viewport class="p-1">
			{@render children?.()}
		</SelectPrimitive.Viewport>
	</SelectPrimitive.Content>
</SelectPrimitive.Portal>
