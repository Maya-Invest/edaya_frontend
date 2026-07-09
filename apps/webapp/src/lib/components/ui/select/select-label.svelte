<script lang="ts">
	import { cn } from '$lib/utils';
	import { Select as SelectPrimitive } from 'bits-ui';

	const {
		class: className,
		children,
		...restProps
	}: SelectPrimitive.GroupHeadingProps = $props();
</script>

<SelectPrimitive.GroupHeading
	class={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
	{...restProps}
>
	{@render children?.()}
</SelectPrimitive.GroupHeading>
