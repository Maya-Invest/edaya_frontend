<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { cn } from '$lib/utils';
	import {
		activeSubjectsDetailTab,
		SUBJECTS_DETAIL_TABS,
	} from '../../lib/subjects-detail-tabs';

	const { subject }: { subject: Subject } = $props();

	const activeTab = $derived(activeSubjectsDetailTab($page.url.pathname, subject.id));

	function tabHref(segment: string) {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const base = detailHref.configSubjectTab(
			subject.id,
			segment as 'progression' | 'logbook',
		);
		return `${base}${next.search}`;
	}
</script>

<div
	data-testid="drawer-tab-bar"
	class="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-secondary/40 p-1 text-xs"
>
	{#each SUBJECTS_DETAIL_TABS as tab (tab.key)}
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
