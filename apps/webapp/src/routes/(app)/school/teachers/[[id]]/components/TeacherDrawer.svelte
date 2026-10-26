<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { kindStyle, kindLabelKey } from '$lib/components/school/shared/drawer-constants';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, X } from '$lib/icons';
	import { activeTeacherDetailTab } from '../../lib/teacher-detail-tabs';
	import TeacherDetailHeader from './TeacherDetailHeader.svelte';
	import TeacherDetailTabBar from './TeacherDetailTabBar.svelte';

	const {
		teacher,
		loading = false,
		onClose,
		children,
	}: {
		teacher?: Teacher;
		loading?: boolean;
		onClose: () => void;
		children: Snippet | undefined;
	} = $props();

	const fixedTabContent = $derived(activeTeacherDetailTab($page.url.pathname, teacher?.id ?? '') === 'timetable');

</script>

<DrawerFrame {onClose} label={$t(kindLabelKey.teacher)}>
	<header class="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
		<span
			class="rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider {kindStyle.teacher}"
		>
			{$t(kindLabelKey.teacher)}
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

	<div data-teacher-drawer-scroll class={fixedTabContent ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-6' : 'scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 md:p-6'}>
		{#if loading || !teacher}
			<div class="flex min-h-[12rem] items-center justify-center" role="status" aria-live="polite">
				<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
			</div>
		{:else}
			<div class={fixedTabContent ? 'flex min-h-0 flex-1 flex-col gap-5' : 'space-y-5'}>
				<div class="shrink-0" data-testid="teacher-detail-identity"><TeacherDetailHeader {teacher} onDeleted={onClose} /></div>
				<div class="shrink-0"><TeacherDetailTabBar {teacher} /></div>
				<div class={fixedTabContent ? 'min-h-0 flex-1 overflow-y-auto' : ''}>
					{@render children?.()}
				</div>
			</div>
		{/if}
	</div>
</DrawerFrame>
