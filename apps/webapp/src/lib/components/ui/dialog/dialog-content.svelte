<script lang="ts">
	import { cn } from '$lib/utils';
	import { Dialog as DialogPrimitive } from 'bits-ui';

	const {
		class: className,
		children,
		...restProps
	}: DialogPrimitive.ContentProps = $props();
</script>

<DialogPrimitive.Portal>
	<DialogPrimitive.Overlay
		class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out"
	/>
	<DialogPrimitive.Content
		class={cn(
			'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg',
			className,
		)}
		{...restProps}
	>
		{@render children?.()}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
