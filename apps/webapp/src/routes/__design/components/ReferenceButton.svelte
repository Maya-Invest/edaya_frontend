<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { LoaderCircle } from '$lib/icons';

	// Preview composition only: the production button keeps its current contract.
	const { children, pendingLabel, variant = 'default', size = 'default', 'aria-busy': ariaBusy, ...props }: ComponentProps<typeof Button> = $props();
	const pending = $derived(ariaBusy === true || ariaBusy === 'true');
</script>

<Button {...props} {variant} {size} aria-busy={ariaBusy} data-reference-button={variant} data-reference-size={size}>
	<span class="reference-button-face">
		<span class="reference-button-label">{@render children?.()}</span>
		{#if pendingLabel}
			<span class="reference-status-slot" aria-hidden="true"><LoaderCircle class={pending ? 'motion-safe:animate-spin' : 'invisible'} /></span>
		{/if}
	</span>
</Button>
{#if pendingLabel}<span class="sr-only" role="status">{pending ? pendingLabel : ''}</span>{/if}
