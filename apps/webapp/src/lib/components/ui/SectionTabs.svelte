<script lang="ts">
	import { cn } from '$lib/utils';

	const { id, label, value, items, onSelect }: {
		id: string;
		label: string;
		value: string;
		items: readonly { value: string; label: string }[];
		onSelect: (value: string) => void;
	} = $props();
	function moveFocus(event: KeyboardEvent) {
		const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
		if (!keys.includes(event.key))
			return;
		const list = event.currentTarget as HTMLElement;
		const buttons = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
		const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
		const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
		event.preventDefault();
		buttons[next]?.focus();
	}
</script>

<!-- The selected tab is the tab stop; arrow keys move focus within the strip. -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class="ui-section-tabs" role="tablist" aria-label={label} aria-orientation="horizontal" onkeydown={moveFocus}>
	{#each items as item (item.value)}
		<button type="button" id={`${id}-tab-${item.value}`} role="tab" aria-controls={`${id}-panel-${item.value}`} aria-selected={value === item.value} tabindex={value === item.value ? 0 : -1} class={cn('ui-section-tab control-focus', value === item.value && 'text-primary')} onclick={() => onSelect(item.value)}>{item.label}</button>
	{/each}
</div>
