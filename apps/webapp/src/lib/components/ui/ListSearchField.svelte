<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { Search } from '$lib/icons';
	import { cn } from '$lib/utils';

	let {
		value = $bindable(''),
		placeholder,
		class: className,
		inputClass,
		oninput,
	}: {
		value?: string;
		placeholder?: string;
		class?: string;
		inputClass?: string;
		oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
	} = $props();
</script>

<div class={cn('relative', className)}>
	<Search
		class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
		aria-hidden="true"
	/>
	<Input
		bind:value
		{oninput}
		placeholder={placeholder ?? $t('common.search')}
		class={cn('h-9 w-56 rounded-full pl-9 text-sm', inputClass)}
	/>
</div>
