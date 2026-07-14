<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import { page } from '$app/stores';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { hasAnyPermission } from '$lib/permissions';
	import { cn } from '$lib/utils';
	import { activeTeacherDetailTab, TEACHER_DETAIL_TABS } from '../../lib/teacher-detail-tabs';

	const { teacher }: { teacher: Teacher } = $props();

	const activeTab = $derived(activeTeacherDetailTab($page.url.pathname, teacher.id));
	const visibleTabs = $derived(TEACHER_DETAIL_TABS.filter(tab =>
		tab.key !== 'availability' || hasAnyPermission(['ACCESS_CONTROL_ASSIGN', 'SCHOOL_STRUCTURE_CONFIGURE']),
	));

	function tabHref(segment: string) {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const base = detailHref.schoolTeacherTab(
			teacher.id,
			segment as 'profile' | 'assignments' | 'availability',
		);
		return `${base}${next.search}`;
	}
</script>

<div
	data-testid="drawer-tab-bar"
	class="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-secondary/40 p-1 text-xs"
>
	{#each visibleTabs as tab (tab.key)}
		<a
			href={tabHref(tab.segment)}
			class={cn(
				'whitespace-nowrap rounded-full px-2.5 py-1.5 font-medium transition',
				activeTab === tab.key
					? 'bg-card text-foreground shadow-soft'
					: 'text-muted-foreground hover:text-foreground',
			)}
		>
			{$t(tab.labelKey)}
		</a>
	{/each}
</div>
