<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { t } from '$lib/i18n';
	import { FileText } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { SvelteMap } from 'svelte/reactivity';
	import { getStudentGradesTabState } from '../student-grades-tab.svelte';
	import {
		readExpandedStudentSubject,
		writeExpandedStudentSubject,
	} from '../student-subject-url';
	import StudentSubjectGroup from './StudentSubjectGroup.svelte';

	const { s }: { s: Student } = $props();

	const gradesTab = getStudentGradesTabState();
	const gradesData = $derived(gradesTab.selection?.studentId === s.id ? gradesTab.page : null);
	const groups = $derived.by(() => {
		const bySubject = new SvelteMap<string, NonNullable<typeof gradesData>['items']>();
		for (const item of gradesData?.items ?? []) {
			const list = bySubject.get(item.subject);
			if (list)
				list.push(item);
			else bySubject.set(item.subject, [item]);
		}
		return (gradesData?.subjects ?? []).map(group => ({ ...group, items: bySubject.get(group.subject) ?? [] }));
	});
	const expandedSubject = $derived(readExpandedStudentSubject($page.url, groups.map(group => group.subject)));

	$effect(() => {
		const requested = $page.url.searchParams.get('subject');
		if (gradesData && requested && gradesTab.selection?.subject === requested && !expandedSubject) {
			void appGoto(writeExpandedStudentSubject($page.url, null), { replaceState: true, keepFocus: true, noScroll: true });
		}
	});

	function setExpandedSubject(subject: string, open: boolean) {
		void appGoto(writeExpandedStudentSubject($page.url, open ? subject : null), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
		});
	}
</script>

{#if gradesTab.moreError === 'denied'}
	<DataState status="denied" />
{:else if gradesData}
	<div>
		<div class="grid grid-cols-3 gap-3">
			<div class="rounded-collection bg-primary/10 p-4">
				<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.average')}</p>
				<p class="mt-1 font-display text-2xl">
					{(gradesData.average ?? 0).toFixed(1)}<span class="text-sm text-muted-foreground">
						/ 20</span
					>
				</p>
			</div>
			<div class="rounded-collection bg-secondary/60 p-4">
				<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.gradedAssessments')}</p>
				<p class="mt-1 font-display text-2xl">{gradesData.graded}</p>
			</div>
			<div class="rounded-collection bg-secondary p-4">
				<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.pendingAssessments')}</p>
				<p class="mt-1 font-display text-2xl">
					{gradesData.total - gradesData.graded}
				</p>
			</div>
		</div>
		<div class="ui-student-tab-section">
			<div class="flex items-center justify-between gap-3">
				<h3 class="ui-student-section-title">
					{$t('student.gradesBySubject')} · {gradesData.total}
				</h3>
			</div>
			<div class="space-y-2">
				{#if gradesData.total === 0}
					<DrawerEmptyState label={$t('student.noGrades')}>
						{#snippet icon()}
							<FileText class="h-5 w-5 text-muted-foreground" />
						{/snippet}
					</DrawerEmptyState>
				{:else}
					{#each groups as { subject, items, average, total, graded } (subject)}
						<StudentSubjectGroup
							{subject}
							{items}
							subjectAvg={average}
							{total}
							{graded}
							canLoadMore={expandedSubject === subject && gradesTab.selection?.subject === subject && !!gradesData.nextCursor}
							loadingMore={gradesTab.loadingMore}
							loadError={gradesTab.moreError === 'error'}
							onMore={() => void gradesTab.loadMore()}
							open={expandedSubject === subject}
							onOpenChange={open => setExpandedSubject(subject, open)}
						/>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
