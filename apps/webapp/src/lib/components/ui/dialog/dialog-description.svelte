<script lang="ts">
	import { cn } from '$lib/utils';
	import { Dialog as DialogPrimitive } from 'bits-ui';

	const { class: className, children, ...restProps }: DialogPrimitive.DescriptionProps = $props();
</script>

<DialogPrimitive.Description class={cn('text-sm text-muted-foreground', className)} {...restProps}>
	{@render children?.()}
</DialogPrimitive.Description>
