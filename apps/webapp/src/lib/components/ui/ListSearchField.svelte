<script lang="ts">
	import { t } from '$lib/i18n';
	import { Search } from '$lib/icons';
	import { cn } from '$lib/utils';

	let {
		value = $bindable(''),
		disabled = false,
		placeholder,
		class: className,
		inputClass,
		oninput,
		onCommit,
	}: {
		value?: string;
		disabled?: boolean;
		placeholder?: string;
		class?: string;
		inputClass?: string;
		onCommit?: () => void;
		oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
	} = $props();
</script>

<label class={cn('ui-search relative block', className)}>
	<Search
		class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
		aria-hidden="true"
	/>
	<input
		type="search"
		{disabled}
		data-testid="list-search"
		bind:value
		oninput={(event) => {
			oninput?.(event);
			if (!event.currentTarget.value)
				onCommit?.();
		}}
		aria-label={placeholder ?? $t('common.search')}
		onkeydown={(event) => {
			if (event.key === 'Enter')
				onCommit?.();
		}}
		placeholder={placeholder ?? $t('common.search')}
		class={cn(
			'control-focus flex min-h-11 w-full rounded-full border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
			inputClass,
		)}
	/>
</label>
