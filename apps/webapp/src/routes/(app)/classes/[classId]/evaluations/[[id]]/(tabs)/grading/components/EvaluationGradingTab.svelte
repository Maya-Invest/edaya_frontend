<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { AlertCircle, Check, Clock } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { getEvaluationsPageState } from '../../../../evaluations-page.svelte';
	import EvaluationGradeEntryModal from '../../../components/EvaluationGradeEntryModal.svelte';
	import { getEvaluationGradingTabState } from '../evaluation-grading-tab.svelte';

	const { evaluation, classId }: { evaluation: Evaluation; classId: string } = $props();

	type EvaluationGradingModal = 'grade-entry';

	const evaluationsPage = getEvaluationsPageState();
	const gradingTab = getEvaluationGradingTabState();
	const modals = createUrlSyncedModals<EvaluationGradingModal>({
		allowed: ['grade-entry'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const gradeEntryOpen = bindUrlModal(modals, 'grade-entry');

	const isHomework = $derived(evaluation.kind === 'homework');
	const classStudents = $derived(gradingTab.studentsFor(classId));
	const gradeEntryStudent = $derived(
		modals.target ? classStudents.find(student => student.id === modals.target) : undefined,
	);
	$effect(() => {
		if (!modals.ready || modals.active !== 'grade-entry') {
			return;
		}
		if (!modals.target) {
			modals.close();
			return;
		}
		if (gradingTab.slice?.classId === classId && !gradeEntryStudent) {
			modals.close();
		}
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
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.submissions')} - {evaluation.submittedCount}/{evaluation.total}
		</Label>
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
			{#each classStudents as student, index (student.id)}
				{@const submission = submissionsByStudent[student.id]}
				{@const status = submission?.status ?? 'missing'}
				{@const meta = subStatusStyle[status]}
				<div class={cn('flex items-center gap-3 px-4 py-3', index % 2 === 1 && 'bg-secondary/30')}>
					<div
						class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary font-display text-[10px] font-semibold text-primary-foreground"
					>
						{student.initials}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{student.name}</p>
						{#if submission?.date}
							<p class="font-mono text-[10px] text-muted-foreground">
								{formatLocaleDate(submission.date, $locale, { day: 'numeric', month: 'short' })}
							</p>
						{/if}
					</div>
					<meta.icon class={cn('h-4 w-4', meta.cls)} />
					<span class={cn('font-mono text-[10px] uppercase', meta.cls)}>
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
	<div class="space-y-2">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('eval.gradebook')} - {evaluation.graded}/{evaluation.total}
		</Label>
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
			{#each classStudents as student, index (student.id)}
				{@const score = evaluationsPage.scoreFor(evaluation.id, student.id)}
				<div
					class={cn(
						'flex items-center justify-between gap-3 px-4 py-3',
						index % 2 === 1 && 'bg-secondary/30',
					)}
				>
					<div class="flex min-w-0 items-center gap-2">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary font-display text-[10px] font-semibold text-primary-foreground"
						>
							{student.initials}
						</div>
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{student.name}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span class="min-w-[3rem] text-right font-display text-sm tabular-nums">
							{score !== null ? score.toFixed(1) : '-'}
							<span class="font-mono text-[10px] text-muted-foreground">/{evaluation.outOf}</span>
						</span>
						<PermissionGate permission="GRADE_INPUT" mode="disable" tooltip={$t('eval.permissionInput')}>
							{#snippet children({ disabled, title })}
								<Button
									variant="outline"
									size="sm"
									class="rounded-full"
									{disabled}
									{title}
									onclick={() => modals.open('grade-entry', { target: student.id })}
								>
									{score !== null ? $t('eval.editGrade') : $t('eval.enterGrade')}
								</Button>
							{/snippet}
						</PermissionGate>
					</div>
				</div>
			{:else}
				<p class="px-4 py-8 text-center text-sm text-muted-foreground">
					{$t('students.noMatch')}
				</p>
			{/each}
		</div>
	</div>
{/if}

{#if gradeEntryStudent}
	<EvaluationGradeEntryModal
		{evaluation}
		student={gradeEntryStudent}
		existingScore={gradeEntryScore}
		bind:open={gradeEntryOpen.open}
	/>
{/if}
