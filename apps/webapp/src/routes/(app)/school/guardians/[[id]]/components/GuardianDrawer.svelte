<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { kindLabelKey, kindStyle } from '$lib/components/school/shared/drawer-constants';
	import Button from '$lib/components/ui/button/button.svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, X, ArrowLeft } from '$lib/icons';
	import { returnToStudent } from '../../../students/lib/student-guardian-navigation';

	const {
		guardian,
		loading = false,
		onClose,
		children,
	}: {
		guardian?: Guardian;
		loading?: boolean;
		onClose: () => void;
		children: Snippet;
	} = $props();

</script>

<DrawerFrame {onClose} label={$t(kindLabelKey.guardian)}>
	<header class="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
		{#if $page.state.studentGuardianOrigin}<Button variant="ghost" size="icon" aria-label={$t('common.back')} onclick={() => returnToStudent($page.state.studentGuardianOrigin!)}><ArrowLeft class="h-4 w-4" /></Button>{/if}
		<span
			class="rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider {kindStyle.guardian}"
		>
			{$t(kindLabelKey.guardian)}
		</span>
		<button
			type="button"
			onclick={onClose}
			aria-label={$t('common.close')}
			class="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
		>
			<X class="h-4 w-4" />
		</button>
	</header>

	<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
		{#if loading || !guardian}
			<div class="flex min-h-[12rem] items-center justify-center" role="status" aria-live="polite">
				<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
			</div>
		{:else}
			{@render children()}
		{/if}
	</div>
</DrawerFrame>
