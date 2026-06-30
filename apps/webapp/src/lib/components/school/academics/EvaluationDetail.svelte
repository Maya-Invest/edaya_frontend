<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import { deleteAssessmentMutation } from '$lib/api/mutations/delete-entity.mutations';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { locale, t } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import { SvelteMap } from 'svelte/reactivity';
	import { get } from 'svelte/store';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import EvaluationGradeEntryModal from './EvaluationGradeEntryModal.svelte';

	const { s }: { s: Evaluation } = $props();

	const classStudents = $derived(
		detailDataContext.studentsForClass(s.classId)
			.sort((left, right) => left.name.localeCompare(right.name, 'fr')),
	);

	const scoresByStudent = $derived.by(() => {
		const map = new SvelteMap<string, number>();
		for (const result of detailDataContext.assessmentResults) {
			if (result.assessmentId === s.id && result.score !== null) {
				map.set(result.studentId, result.score);
			}
		}
		return map;
	});

	const formattedDate = $derived(
		s.date
			? new Date(s.date).toLocaleDateString($locale, {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			})
			: '—',
	);
</script>

<div class="space-y-5">
	<div>
		<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.subject}</p>
		<h3 class="mt-1 font-display text-2xl font-semibold">{s.title}</h3>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="rounded-xl bg-primary/10 p-3">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('eval.average')}</p>
			<p class="mt-1 font-display text-xl tabular-nums">
				{s.graded > 0 ? s.averageMark.toFixed(1) : '—'}
				<span class="text-sm text-muted-foreground">/ {s.outOf}</span>
			</p>
		</div>
		<div class="rounded-xl bg-secondary/60 p-3">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('eval.graded')}</p>
			<p class="mt-1 font-display text-xl tabular-nums">{s.graded}/{s.total}</p>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('eval.date')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{formattedDate}
			</div>
		</DrawerField>
		<DrawerField label={$t('eval.coefficient')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				×{s.coefficient}
			</div>
		</DrawerField>
	</div>

	<DrawerActionBar>
		<PermissionGate permission="GRADE_INPUT" mode="disable" tooltip={$t('eval.permissionCreate')}>
			{#snippet children({ disabled, title })}
				<DeleteEntityButton
					{disabled}
					{title}
					confirmTitle={$t('common.deleteConfirmTitle')}
					confirmDescription={$t('eval.deleteConfirm', { title: s.title })}
					onConfirm={() => deleteAssessmentMutation(s.id, {
						successMessage: get(t)('eval.toastDeleted', { title: s.title }),
					})}
				/>
			{/snippet}
		</PermissionGate>
	</DrawerActionBar>

	<div class="space-y-2 border-t border-border pt-4">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('eval.gradebook')} · {s.graded}/{s.total}
		</Label>
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
			{#each classStudents as student, index (student.id)}
				{@const score = scoresByStudent.get(student.id) ?? null}
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
							<p class="font-mono text-[10px] text-muted-foreground">{student.classId}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span class="min-w-[3rem] text-right font-display text-sm tabular-nums">
							{score !== null ? score.toFixed(1) : '—'}
							<span class="font-mono text-[10px] text-muted-foreground">/{s.outOf}</span>
						</span>
						<EvaluationGradeEntryModal evaluation={s} {student} existingScore={score} />
					</div>
				</div>
			{:else}
				<p class="px-4 py-8 text-center text-sm text-muted-foreground">
					{$t('students.noMatch')}
				</p>
			{/each}
		</div>
	</div>
</div>
