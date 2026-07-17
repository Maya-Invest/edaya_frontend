<script lang="ts">
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
	<input
		type="search"
		bind:value
		{oninput}
		placeholder={placeholder ?? $t('common.search')}
		class={cn(
			'flex h-9 w-full rounded-full border border-input bg-background py-2 pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
			inputClass,
		)}
	/>
</div>
