<script lang="ts">
	import { Check } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';

	let {
		class: className,
		checked = $bindable(false),
		onCheckedChange,
		...restProps
	}: CheckboxPrimitive.RootProps = $props();
</script>

<CheckboxPrimitive.Root
	bind:checked
	{onCheckedChange}
	class={cn(
		'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
		className,
	)}
	{...restProps}
>
	{#snippet children({ checked: isChecked })}
		<div class="flex items-center justify-center text-current">
			{#if isChecked}
				<Check class="h-3.5 w-3.5" />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
