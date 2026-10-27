<script lang="ts">
	import { Select as Primitive } from 'bits-ui';
	import { onMount, tick, untrack } from 'svelte';

	let { type, value = $bindable(), open = $bindable(false), onValueChange, name, required = false, disabled = false, children, ...props }: Primitive.RootProps = $props();
	let native: HTMLSelectElement;
	let holder: HTMLSpanElement;
	async function changed(next: string | string[]) {
		value = next;
		holder?.querySelector('[aria-haspopup=listbox]')?.removeAttribute('aria-invalid');
		(onValueChange as ((value: string | string[]) => void) | undefined)?.(next);
		await tick();
		native?.dispatchEvent(new Event('input', { bubbles: true }));
		native?.dispatchEvent(new Event('change', { bubbles: true }));
	}
	onMount(() => {
		const initial = untrack(() => Array.isArray(value) ? [...value] : value);
		const reset = () => {
			void tick().then(() => changed(initial ?? (type === 'multiple' ? [] : '')));
		};
		const form = native.form;
		form?.addEventListener('reset', reset);
		return () => form?.removeEventListener('reset', reset);
	});
	const values = $derived(Array.isArray(value) ? value : [value ?? '']);
</script>
<span class="contents" data-select-field bind:this={holder}>
	{#if type === 'multiple'}
		<Primitive.Root {...props} type="multiple" value={Array.isArray(value) ? value : []} onValueChange={changed} bind:open {disabled} {required}>{@render children?.()}</Primitive.Root>
	{:else}
		<Primitive.Root {...props} type="single" value={typeof value === 'string' ? value : ''} onValueChange={changed} bind:open {disabled} {required}>{@render children?.()}</Primitive.Root>
	{/if}
	<select bind:this={native} hidden tabindex="-1" aria-hidden="true" data-select-value {name} {required} {disabled} multiple={type === 'multiple'} value={type === 'multiple' ? values : values[0]} onchange={() => {}} oninvalid={() => {
		const trigger = holder.querySelector<HTMLElement>('[aria-haspopup=listbox]');
		trigger?.setAttribute('aria-invalid', 'true');
	}}>
		{#each values as option (option)}<option value={option} selected>{option}</option>{/each}
	</select>
</span>
