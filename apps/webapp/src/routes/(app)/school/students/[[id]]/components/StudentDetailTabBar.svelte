<script lang="ts">
	import type { Student } from '$lib/types/school';
	import type { StudentDetailTabSegment } from '../../lib/student-detail-tabs';
	import { page } from '$app/stores';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { cn } from '$lib/utils';
	import { activeStudentDetailTab, STUDENT_DETAIL_TABS } from '../../lib/student-detail-tabs';

	const { student }: { student: Student } = $props();

	const activeTab = $derived(activeStudentDetailTab($page.url.pathname, student.id));

	function tabHref(segment: StudentDetailTabSegment) {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const base = detailHref.schoolStudentTab(student.id, segment);
		return `${base}${next.search}`;
	}
</script>

<div
	data-testid="drawer-tab-bar"
	class="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-secondary/40 p-1 text-xs"
>
	{#each STUDENT_DETAIL_TABS as tab (tab.key)}
		<a
			href={tabHref(tab.segment)}
			data-sveltekit-noscroll
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
