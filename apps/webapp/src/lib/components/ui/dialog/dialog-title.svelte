<script lang="ts">
	import { cn } from '$lib/utils';
	import { Dialog as DialogPrimitive } from 'bits-ui';

	const { class: className, children, ...restProps }: DialogPrimitive.TitleProps = $props();
</script>

<DialogPrimitive.Title
	class={cn('text-lg font-semibold leading-none tracking-tight', className)}
	{...restProps}
>
	{@render children?.()}
</DialogPrimitive.Title>
