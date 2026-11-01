<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { Dialog } from 'bits-ui';
	import { cubicOut } from 'svelte/easing';
	import { MediaQuery } from 'svelte/reactivity';
	import { fade, fly } from 'svelte/transition';
	import DrawerPortal from './DrawerPortal.svelte';

	const {
		label,
		testId,
		open = true,
		closeDisabled = false,
		guardDirtyWork = true,
		onClose,
		children,
	}: {
		label: string;
		testId?: string;
		open?: boolean;
		closeDisabled?: boolean;
		guardDirtyWork?: boolean;
		onClose: () => void;
		children: Snippet;
	} = $props();
	const dirtyWork = getDirtyWork();
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	function duration(node: Element) {
		return reducedMotion.current ? 0 : Number.parseFloat(getComputedStyle(node).getPropertyValue('--motion-enter')) || 0;
	}

	function slide(node: Element) {
		return fly(node, { x: node.getBoundingClientRect().width, opacity: 1, duration: duration(node), easing: cubicOut });
	}

	function backdrop(node: Element) {
		return fade(node, { duration: duration(node) });
	}

	function requestClose(event: Event) {
		// Keep the modal mounted and focused until its owner accepts the close.
		event.preventDefault();
		if (closeDisabled)
			return;
		if (guardDirtyWork && dirtyWork)
			dirtyWork.request(onClose);
		else onClose();
	}
</script>

{#if open}
	<DrawerPortal>
		<Dialog.Root open>
			<Dialog.Overlay forceMount>
				{#snippet child({ props })}
					<div {...props} class="ui-drawer-overlay fixed inset-0 z-50 bg-foreground/40" transition:backdrop|global></div>
				{/snippet}
			</Dialog.Overlay>
			<Dialog.Content forceMount aria-describedby={undefined} onEscapeKeydown={requestClose} onInteractOutside={requestClose}>
				{#snippet child({ props })}
					<div {...props} data-testid={testId} class="ui-dialog ui-drawer fixed inset-y-0 right-0 z-50 flex h-dvh max-h-dvh w-full flex-col overflow-hidden border-l border-border bg-card lg:w-1/2" transition:slide|global>
						<Dialog.Title class="sr-only">{label}</Dialog.Title>
						{@render children()}
					</div>
				{/snippet}
			</Dialog.Content>
		</Dialog.Root>
	</DrawerPortal>
{/if}
