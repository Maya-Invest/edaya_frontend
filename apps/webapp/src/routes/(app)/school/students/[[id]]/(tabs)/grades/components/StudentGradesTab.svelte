<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { FileText } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { getStudentGradesTabState } from '../student-grades-tab.svelte';
	import {
		readExpandedStudentSubject,
		writeExpandedStudentSubject,
	} from '../student-subject-url';
	import StudentSubjectGroup from './StudentSubjectGroup.svelte';

	const { s }: { s: Student } = $props();

	const gradesTab = getStudentGradesTabState();
	const gradesData = $derived(
		gradesTab.gradesSummaryFor(s.id, row => detailHref.classEvaluation(row.classGroupId, row.assessmentId)),
	);
	const collapsibleSubjects = $derived(
		gradesData.subjectGroups
			.filter(group => group.items.length > 1)
			.map(group => group.subject),
	);
	const expandedSubject = $derived(
		readExpandedStudentSubject($page.url, collapsibleSubjects),
	);

	afterNavigate(() => {
		const canonicalHref = writeExpandedStudentSubject($page.url, expandedSubject);
		if (canonicalHref !== `${$page.url.pathname}${$page.url.search}`) {
			void appGoto(canonicalHref, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
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

<div>
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-collection bg-primary/10 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.average')}</p>
			<p class="mt-1 font-display text-2xl">
				{gradesData.overall != null ? gradesData.overall.toFixed(1) : $t('dataState.unavailable')}<span class="text-sm text-muted-foreground">
					/ 20</span
				>
			</p>
		</div>
		<div class="rounded-collection bg-secondary/60 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.gradedAssessments')}</p>
			<p class="mt-1 font-display text-2xl">{gradesData.valid.length}</p>
		</div>
		<div class="rounded-collection bg-secondary p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.pendingAssessments')}</p>
			<p class="mt-1 font-display text-2xl">
				{gradesData.studentEvals.length - gradesData.valid.length}
			</p>
		</div>
	</div>
	<div class="ui-student-tab-section">
		<div class="flex items-center justify-between gap-3">
			<h3 class="ui-student-section-title">
				{$t('student.gradesBySubject')} · {gradesData.studentEvals.length}
			</h3>
		</div>
		<div class="space-y-2">
			{#if gradesData.studentEvals.length === 0}
				<DrawerEmptyState label={$t('student.noGrades')}>
					{#snippet icon()}
						<FileText class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each gradesData.subjectGroups as { subject, items, subjectAvg } (subject)}
					<StudentSubjectGroup
						{subject}
						{items}
						{subjectAvg}
						open={expandedSubject === subject}
						onOpenChange={open => setExpandedSubject(subject, open)}
					/>
				{/each}
			{/if}
		</div>
	</div>
</div>
