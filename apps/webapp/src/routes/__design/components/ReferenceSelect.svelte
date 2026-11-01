<script lang="ts" generics="T extends string">
	import Label from '$lib/components/ui/label/label.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';

	const generatedId = $props.id();
	let { value = $bindable(), options, label, id = generatedId, disabled = false, required = false, labelHidden = false, onValueChange, ...props }: {
		'id'?: string;
		'disabled'?: boolean;
		'required'?: boolean;
		'labelHidden'?: boolean;
		'onValueChange'?: (value: T) => void;
		'data-grade-input'?: boolean;
		'data-testid'?: string;
		'aria-invalid'?: boolean | 'true' | 'false';
		'aria-describedby'?: string;
		'value'?: T;
		'options': readonly { value: T; label: string; disabled?: boolean }[];
		'label': string;
	} = $props();
</script>
<div class="min-w-0" class:space-y-2={!labelHidden}>
	<Label for={id} class={labelHidden ? 'sr-only' : undefined}>{label}</Label>
	<SelectField {...props} {id} bind:value {disabled} {required} aria-label={label} onchange={() => onValueChange?.(value as T)}>{#each options as option (option.value)}<option value={option.value} disabled={option.disabled}>{option.label}</option>{/each}</SelectField>
</div>
