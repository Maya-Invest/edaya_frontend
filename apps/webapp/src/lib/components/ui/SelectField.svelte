<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { Select as Primitive } from 'bits-ui';
	import { onMount, tick } from 'svelte';
	import * as Select from './select';

	const generatedId = $props.id();
	let { value = $bindable('' as T), children, id = generatedId, class: className, disabled = false, title, required = false, onchange, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, 'aria-describedby': describedBy, 'aria-invalid': invalid, 'data-testid': testId, 'data-grade-input': gradeInput, ...props }: Omit<HTMLSelectAttributes, 'value' | 'children'> & {
		'value'?: T;
		'children'?: Snippet;
		'data-testid'?: string;
		'data-grade-input'?: boolean;
	} = $props();
	let native: HTMLSelectElement;
	let selected = $state('');
	let choices = $state<{ key: string; label: string; disabled: boolean; group: string }[]>([]);
	const label = $derived(choices.find(option => option.key === selected)?.label ?? '—');
	function sync() {
		if (!native)
			return;
		choices = Array.from(native.options).map((option, index) => ({ key: String(index), label: option.text, disabled: option.disabled || (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled), group: option.parentElement instanceof HTMLOptGroupElement ? option.parentElement.label : '' }));
		selected = native.selectedIndex >= 0 ? String(native.selectedIndex) : '';
	}
	async function choose(key: string) {
		const index = Number(key);
		const option = native?.options[index];
		if (!option || choices[index]?.disabled)
			return;
		value = ('__value' in option ? option.__value : option.value) as T;
		await tick();
		native.selectedIndex = index;
		document.getElementById(id ?? generatedId)?.removeAttribute('aria-invalid');
		native.dispatchEvent(new Event('input', { bubbles: true }));
		native.dispatchEvent(new Event('change', { bubbles: true }));
		sync();
	}
	$effect(() => {
		void value;
		void tick().then(sync);
	});
	onMount(() => {
		sync();
		const observer = new MutationObserver(sync);
		observer.observe(native, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'label', 'value'] });
		const reset = () => {
			void tick().then(sync);
		};
		native.form?.addEventListener('reset', reset);
		return () => {
			observer.disconnect();
			native.form?.removeEventListener('reset', reset);
		};
	});
</script>
<span class="ui-select-field min-w-0 block w-full" data-select-field>
	<Primitive.Root type="single" value={selected} onValueChange={choose} disabled={disabled ?? false}>
		<Select.Trigger id={id ?? generatedId} class={className} {title} disabled={disabled ?? false} aria-label={ariaLabel} aria-labelledby={ariaLabelledby} aria-describedby={describedBy} aria-invalid={invalid} aria-required={required ?? false} data-testid={testId} data-grade-input={gradeInput}><span>{label}</span></Select.Trigger>
		<Select.Content align="start" collisionPadding={16}>
			{#each choices as option, index (option.key)}
				{#if option.group && (index === 0 || choices[index - 1]?.group !== option.group)}<p class="px-3 py-2 text-xs font-semibold text-muted-foreground">{option.group}</p>{/if}
				<Select.Item value={option.key} label={option.label} disabled={option.disabled} aria-disabled={option.disabled || undefined}>{option.label}</Select.Item>
			{/each}
		</Select.Content>
	</Primitive.Root>
	<select {...props} bind:this={native} bind:value {disabled} {required} {onchange} hidden tabindex="-1" aria-hidden="true" data-select-value data-control-target={id ?? generatedId}>{@render children?.()}</select>
</span>
