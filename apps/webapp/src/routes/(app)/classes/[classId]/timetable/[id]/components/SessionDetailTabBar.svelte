<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { followDrawerTabLink } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import {
		activeSessionDetailTab,
		SESSION_DETAIL_TABS,
		sessionDetailTabsForKind,
	} from '../../lib/timetable-detail-tabs';

	const { s }: { s: PlanningEvent } = $props();

	const classId = $derived(s.classId);
	const visibleTabs = $derived(
		SESSION_DETAIL_TABS.filter(tab => sessionDetailTabsForKind(s.kind).includes(tab.key)),
	);
	const activeTab = $derived(activeSessionDetailTab($page.url.pathname, classId, s.id));

	function tabHref(segment: string) {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const base = detailHref.classPlanningTab(
			classId,
			s.id,
			segment as 'details' | 'attendance' | 'logbook',
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
			data-sveltekit-noscroll
			onclick={event => followDrawerTabLink(event, tabHref(tab.segment))}
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
