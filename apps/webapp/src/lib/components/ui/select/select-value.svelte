<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Select as SelectPrimitive } from 'bits-ui';

	const {
		placeholder,
		children,
		...restProps
	}: SelectPrimitive.ValueProps & { children?: Snippet } = $props();
</script>

<SelectPrimitive.Value {placeholder} {...restProps}>
	{@render children?.()}
</SelectPrimitive.Value>
