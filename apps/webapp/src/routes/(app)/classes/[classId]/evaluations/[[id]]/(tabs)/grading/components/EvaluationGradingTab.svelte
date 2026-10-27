<script lang="ts">
	import { provideCollectionPresentation } from '$lib/list/collection-presentation.svelte';

	provideCollectionPresentation();
	import type { Evaluation } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { AlertCircle, Check, Clock } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { getEvaluationsPageState } from '../../../../evaluations-page.svelte';
	import { gradeCorrectable, gradeEditable } from '../../../../lib/grading-task';
	import EvaluationCorrectionModal from '../../../components/EvaluationCorrectionModal.svelte';
	import EvaluationGradeEntryModal from '../../../components/EvaluationGradeEntryModal.svelte';
	import GradeResultValue from '../../../components/GradeResultValue.svelte';
	import { getEvaluationGradingTabState } from '../evaluation-grading-tab.svelte';

	const { evaluation, classId }: { evaluation: Evaluation; classId: string } = $props();

	type EvaluationGradingModal = 'grade-entry' | 'correct-mark';

	const evaluationsPage = getEvaluationsPageState();
	const gradingTab = getEvaluationGradingTabState();
	const modals = createUrlSyncedModals<EvaluationGradingModal>({
		allowed: ['grade-entry', 'correct-mark'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const gradeEntryOpen = bindUrlModal(modals, 'grade-entry');
	const correctionOpen = bindUrlModal(modals, 'correct-mark');
	const marksByStudent = $derived(new Map(gradingTab.review?.results.map(row => [row.studentId, row])));
	const columns = $derived([
		{ key: 'student', label: $t('corrections.student'), span: 3, required: true },
		{ key: 'original', label: $t('gradeInspection.original'), span: 2 },
		{ key: 'captured', label: $t('gradeTask.recorded'), span: 2 },
		{ key: 'comment', label: $t('gradeInspection.comment'), span: 3 },
		{ key: 'status', label: $t('common.status'), span: 2 },
		{ key: 'actions', label: $t('list.rowActions'), span: 1 },
	]);

	const isHomework = $derived(evaluation.kind === 'homework');
	const classStudents = $derived(gradingTab.studentsFor(classId));
	const gradeEntryStudent = $derived.by(() => {
		return modals.target ? classStudents.find(student => student.id === modals.target) : undefined;
	});
	const gradeEntryScore = $derived(
		gradeEntryStudent ? evaluationsPage.scoreFor(evaluation.id, gradeEntryStudent.id) : null,
	);

	const submissionsByStudent = $derived.by(() => {
		const submissions: Record<string, Evaluation['submissions'][number] | undefined> = {};
		for (const submission of evaluation.submissions ?? []) {
			submissions[submission.studentId] = submission;
		}
		return submissions;
	});
	const subStatusStyle = {
		submitted: { icon: Check, cls: 'text-accent' },
		late: { icon: Clock, cls: 'text-highlight' },
		missing: { icon: AlertCircle, cls: 'text-muted-foreground' },
	} as const;
</script>

{#if isHomework}
	<div class="space-y-2">
		<h3 class="text-xl font-semibold">
			{$t('drawer.submissions')} - {evaluation.submittedCount}/{evaluation.total}
		</h3>
		<div class="overflow-hidden rounded-collection border border-border bg-card shadow-soft">
			{#each classStudents as student, index (student.id)}
				{@const submission = submissionsByStudent[student.id]}
				{@const status = submission?.status ?? 'missing'}
				{@const meta = subStatusStyle[status]}
				<div class={cn('flex items-center gap-3 px-4 py-3', index % 2 === 1 && 'bg-secondary/30')}>
					<div
						class="flex h-8 w-8 items-center justify-center rounded-collection bg-primary font-display text-xs font-semibold text-primary-foreground"
					>
						{student.initials}
					</div>
					<div class="min-w-0 flex-1">
						<p class="break-words text-sm font-semibold">{student.name}</p>
						{#if submission?.date}
							<p class="font-sans tabular-nums text-xs text-muted-foreground">
								{formatLocaleDate(submission.date, $locale, { day: 'numeric', month: 'short' })}
							</p>
						{/if}
					</div>
					<meta.icon class={cn('h-4 w-4', meta.cls)} />
					<span class={cn('font-sans tabular-nums text-xs uppercase', meta.cls)}>
						{$t(`submission.${status}`)}
					</span>
				</div>
			{:else}
				<p class="px-4 py-8 text-center text-sm text-muted-foreground">
					{$t('students.noMatch')}
				</p>
			{/each}
		</div>
	</div>
{:else}
	<section class="space-y-4">
		<h3 class="text-xl font-semibold">{$t('eval.gradebook')}</h3>
		<ListEntityTable rows={classStudents} {columns} listKey="assessment-results" emptyLabel={$t('gradeInspection.empty')}>
			{#snippet cell(student, column)}
				{@const mark = marksByStudent.get(student.id)}
				{#if column.key === 'student'}<span class="text-sm font-semibold">{student.name}</span>
				{:else if column.key === 'original'}<GradeResultValue result={mark} mode="original" />
				{:else if column.key === 'captured'}<GradeResultValue result={mark} mode="captured" />
				{:else if column.key === 'comment'}<p class="whitespace-pre-wrap text-sm">{mark?.notes || $t('value.notProvided')}</p>
				{:else if column.key === 'status'}
					<div class="space-y-1 text-sm">
						<p>{mark ? $t(`marks.${gradingTab.review?.assessment.marksStatus}`) : $t('value.notProvided')}</p>
						{#if mark && gradingTab.review?.publishedResultIds.includes(mark.id)}<p>{$t('gradeInspection.published')}</p>{/if}
						{#each gradingTab.review?.corrections.filter(row => row.changes.some(change => change.resultId === mark?.id)) ?? [] as correction (correction.id)}<p>{$t(`marks.${correction.status}`)}</p>{/each}
					</div>
				{:else if column.key === 'actions'}
					<PermissionGate permission="GRADE_MANAGE" {classId} subject={evaluation.classSubjectId} subjectId={evaluationsPage.subjectsFor(classId).find(row => row.id === evaluation.classSubjectId)?.subjectId} assessmentId={evaluation.id}>
						{#snippet children({ disabled })}
							<RowActionMenu label={`${$t('list.rowActions')} · ${student.name}`}>
								{#if gradingTab.review?.assessment.marksStatus === 'submitted' && mark}
									<Button variant="ghost" class="w-full justify-start" disabled={disabled || !gradeCorrectable(gradingTab.review, mark.id)} title={!gradeCorrectable(gradingTab.review, mark.id) ? $t('gradeInspection.correctionBlocked') : undefined} onclick={() => modals.open('correct-mark', { target: mark.id })}>{$t('gradeInspection.correct')}</Button>
								{:else}
									<Button variant="ghost" class="w-full justify-start" disabled={disabled || !gradingTab.review || !gradeEditable(gradingTab.review, student.id)} title={gradingTab.review?.assessment.marksStatus !== 'draft' ? $t('gradeTask.frozen') : mark && gradingTab.review?.publishedResultIds.includes(mark.id) ? $t('marks.publishedLocked', { count: 1 }) : gradingTab.review?.gradingPolicy?.status !== 'completed' ? $t('gradeTask.policyUnavailable') : undefined} onclick={() => modals.open('grade-entry', { target: student.id })}>{mark ? $t('eval.editGrade') : $t('eval.enterGrade')}</Button>
								{/if}
							</RowActionMenu>
						{/snippet}
					</PermissionGate>
				{/if}
			{/snippet}
		</ListEntityTable>
		{#if gradingTab.review}<p class="text-sm">{$t('gradeInspection.summary', { recorded: gradingTab.review.results.length, total: gradingTab.review.students.length })}</p>{/if}
	</section>
{/if}

{#if gradeEntryStudent}
	{#key `${evaluationsPage.scope}|${evaluation.id}|${gradeEntryStudent.id}`}
		<EvaluationGradeEntryModal
			{evaluation}
			student={gradeEntryStudent}
			existingScore={gradeEntryScore}
			bind:open={gradeEntryOpen.open}
		/>
	{/key}
{/if}

{#if gradeEntryOpen.open && gradingTab.slice && !gradeEntryStudent}
	<FormModal bind:open={gradeEntryOpen.open} title={$t('eval.editGrade')} onSubmit={() => {}} submitDisabled>
		<p role="alert">{$t('form.targetUnavailable')}</p>
		{#snippet footer({ close })}<Button variant="outline" onclick={close}>{$t('common.close')}</Button>{/snippet}
	</FormModal>
{/if}

{#if correctionOpen.open}
	{#key `${evaluationsPage.scope}|${evaluation.id}|${modals.target}`}
		<EvaluationCorrectionModal resultId={modals.target ?? ''} bind:open={correctionOpen.open} />
	{/key}
{/if}
