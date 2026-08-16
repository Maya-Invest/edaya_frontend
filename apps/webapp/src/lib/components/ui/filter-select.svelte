<script lang="ts">
	import { ChevronDown } from '$lib/icons';
	import { cn } from '$lib/utils';

	export type FilterSelectOption = { value: string; label: string };
	export type FilterSelectGroup = { label: string; options: FilterSelectOption[] };

	let {
		value = $bindable(''),
		class: className,
		options = [],
		groups = [],
		onchange,
	}: {
		value?: string;
		class?: string;
		options?: FilterSelectOption[];
		groups?: FilterSelectGroup[];
		onchange?: (value: string) => void;
	} = $props();

	const selectClass
		= 'h-full w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
</script>

<div class={cn('relative inline-flex items-center', className)}>
	<select
		{value}
		class={selectClass}
		aria-label="Filter"
		data-testid="list-filter"
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
