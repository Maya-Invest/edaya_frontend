<script lang="ts">
	import { ChevronDown } from '$lib/icons';
	import { cn } from '$lib/utils';

	export type FilterSelectOption = { value: string; label: string };
	export type FilterSelectGroup = { label: string; options: FilterSelectOption[] };

	let {
		value = $bindable(''),
		class: className,
		id,
		'aria-label': ariaLabel = 'Filter',
		options = [],
		groups = [],
		onchange,
	}: {
		'value'?: string;
		'class'?: string;
		'id'?: string;
		'aria-label'?: string;
		'options'?: FilterSelectOption[];
		'groups'?: FilterSelectGroup[];
		'onchange'?: (value: string) => void;
	} = $props();

	const selectClass
		= 'control-focus min-h-11 h-full w-full appearance-none border border-input bg-background py-2 pl-3 pr-8 text-sm disabled:cursor-not-allowed disabled:opacity-50';
</script>

<div class={cn('relative inline-flex min-h-11 items-center rounded-full', className)}>
	<select
		{id}
		{value}
		class={selectClass}
		aria-label={ariaLabel}
		data-testid="list-filter-select"
		onchange={(event) => {
			const next = event.currentTarget.value;
			value = next;
			onchange?.(next);
		}}
	>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
		{#each groups as group (group.label)}
			<optgroup label={group.label}>
				{#each group.options as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</optgroup>
		{/each}
	</select>
	<ChevronDown
		class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
		aria-hidden="true"
	/>
</div>

<style>
	select {
		border-radius: inherit;
	}
</style>
