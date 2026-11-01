<script lang="ts" module>
	import type { ClassValue } from '$lib/utils';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	export type ButtonVariant = 'default' | 'destructive' | 'destructive-confirm' | 'outline' | 'secondary' | 'ghost' | 'link';
	export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';
	export type IconTreatment = 'circle' | 'quiet';
	export function buttonVariants({ variant = 'default', size = 'default', class: className, iconTreatment = 'circle', presentation = 'action' }: {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: ClassValue;
		busy?: boolean;
		iconTreatment?: IconTreatment;
		presentation?: 'action' | 'menu-item';
	} = {}) {
		return cn('control-focus ui-action', `ui-action-${variant}`, size === 'icon' && `ui-icon ui-icon-${iconTreatment}`, presentation === 'menu-item' && size !== 'icon' && 'ui-menu-action', className);
	}
</script>
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LoaderCircle } from '$lib/icons';
	import { getContext } from 'svelte';
	import { COLLECTION_MENU } from '../collection/context';

	const menu = getContext(COLLECTION_MENU);
	const { class: className, 'aria-busy': ariaBusy, pendingLabel, variant = 'default', size = 'default', iconTreatment = 'circle', presentation = menu ? 'menu-item' : 'action', type = 'button', disabled = false, onclick, children, ...restProps }: HTMLButtonAttributes & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		iconTreatment?: IconTreatment;
		presentation?: 'action' | 'menu-item';
		children?: Snippet;
		pendingLabel?: string;
	} = $props();
	const pending = $derived(ariaBusy === true || ariaBusy === 'true');
</script>
<button {type} disabled={disabled || pending} aria-busy={ariaBusy} {onclick} class={buttonVariants({ variant, size, iconTreatment, presentation, class: className })} {...restProps}>
	<span class="ui-action-content">{@render children?.()}{#if pendingLabel}<span class="ui-action-status" aria-hidden="true"><LoaderCircle class={pending ? 'motion-safe:animate-spin' : 'invisible'} /></span>{/if}</span>
</button>
{#if pendingLabel}<span class="sr-only" role="status">{pending ? pendingLabel : ''}</span>{/if}
