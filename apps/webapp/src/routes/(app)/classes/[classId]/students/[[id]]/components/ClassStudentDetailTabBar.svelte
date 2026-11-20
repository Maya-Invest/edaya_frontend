<script lang="ts">
	import type { Student } from '$lib/types/school';
	import type { StudentDetailTabSegment } from '../../../../../school/students/lib/student-detail-tabs';
	import { page } from '$app/stores';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { followDrawerTabLink } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import { STUDENT_DETAIL_TABS } from '../../../../../school/students/lib/student-detail-tabs';
	import { activeClassStudentDetailTab } from '../../lib/class-students-helpers';

	const { student }: { student: Student } = $props();

	const classId = $derived($page.params.classId ?? '6a');
	const activeTab = $derived(activeClassStudentDetailTab($page.url.pathname, classId, student.id));

	function tabHref(segment: StudentDetailTabSegment) {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const base = detailHref.classStudentTab(classId, student.id, segment);
		return `${base}${next.search}`;
	}
</script>

<nav
	data-testid="drawer-tab-bar"
	class="ui-drawer-tabs" aria-label={$t('student.profile.sections')}
>
	{#each STUDENT_DETAIL_TABS as tab (tab.key)}
		<a
			href={tabHref(tab.segment)}
			aria-current={activeTab === tab.key ? 'page' : undefined}
			data-sveltekit-noscroll
			onclick={event => followDrawerTabLink(event, tabHref(tab.segment))}
			class={cn(
				'ui-section-tab control-focus shrink-0',
				activeTab === tab.key
					? 'ui-drawer-tab-active'
					: 'text-muted-foreground hover:text-foreground',
			)}
		>
			{$t(tab.labelKey)}
		</a>
	{/each}
</nav>
