<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';

	const { child, children, ...restProps }: PopoverPrimitive.TriggerProps = $props();
</script>

<PopoverPrimitive.Trigger {...restProps} {child}>
	{@render children?.()}
</PopoverPrimitive.Trigger>
