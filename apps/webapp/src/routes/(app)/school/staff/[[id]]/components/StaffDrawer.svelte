<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { kindStyle, kindLabelKey } from '$lib/components/school/shared/drawer-constants';
	import { t } from '$lib/i18n';
	import { LoaderCircle, X } from '$lib/icons';
	import StaffDetailHeader from './StaffDetailHeader.svelte';
	import StaffDetailTabBar from './StaffDetailTabBar.svelte';

	const {
		staff,
		loading = false,
		onClose,
		children,
	}: {
		staff?: StaffMember;
		loading?: boolean;
		onClose: () => void;
		children: Snippet;
	} = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	role="presentation"
	onclick={onClose}
	class="fixed inset-0 z-40 bg-primary/5 motion-safe:animate-fade-in"
></div>
<aside
	class="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-panel motion-safe:animate-slide-in-right md:w-1/2"
	aria-label={$t(kindLabelKey.staff)}
>
	<header class="flex items-center justify-between border-b border-border px-6 py-4">
		<span
			class="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider {kindStyle.staff}"
		>
			{$t(kindLabelKey.staff)}
		</span>
		<button
			type="button"
			onclick={onClose}
			class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
		>
			<X class="h-4 w-4" />
		</button>
	</header>

	<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-6">
		{#if loading || !staff}
			<div class="flex min-h-[12rem] items-center justify-center" role="status" aria-live="polite">
				<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
			</div>
		{:else}
			<div class="space-y-5">
				<StaffDetailHeader {staff} onDeleted={onClose} />
				<StaffDetailTabBar {staff} />
				{@render children()}
			</div>
		{/if}
	</div>
</aside>
