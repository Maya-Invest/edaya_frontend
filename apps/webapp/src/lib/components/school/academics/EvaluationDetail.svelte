<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import { deleteAssessmentMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { locale, t } from '$lib/i18n';
	import { Check, Clock, AlertCircle, FileText, Paperclip } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import EvaluationCreateModal from './EvaluationCreateModal.svelte';
	import EvaluationGradeEntryModal from './EvaluationGradeEntryModal.svelte';

	const { s }: { s: Evaluation } = $props();

	let attachOpen = $state(false);
	let editOpen = $state(false);

	const isHomework = $derived(s.kind === 'homework');

	const classStudents = $derived(
		detailDataContext.studentsForClass(s.classId)
			.sort((left, right) => left.name.localeCompare(right.name, 'fr')),
	);

	const scoresByStudent = $derived.by(() => {
		const map = new Map<string, number>();
		for (const result of detailDataContext.assessmentResults) {
			if (result.assessmentId === s.id && result.score !== null) {
				map.set(result.studentId, result.score);
			}
		}
		return map;
	});

	const submissionsByStudent = $derived.by(() => {
		const map = new Map(s.submissions.map(submission => [submission.studentId, submission]));
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

	const subStatusStyle = {
		submitted: { icon: Check, cls: 'text-accent' },
		late: { icon: Clock, cls: 'text-highlight' },
		missing: { icon: AlertCircle, cls: 'text-muted-foreground' },
	} as const;
</script>

<div class="space-y-5">
	<DrawerEntityHeader name={s.title} summary="{s.subject} · {formattedDate}">
		{#snippet chips()}
			<span
				class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				{$t(`eval.kind.${s.kind}`)}
			</span>
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="GRADE_INPUT" mode="disable" tooltip={$t('eval.permissionCreate')}>
				{#snippet children({ disabled, title })}
					{#if isHomework}
						<Button variant="outline" size="sm" class="rounded-full" {disabled} {title} onclick={() => (editOpen = true)}>
							{$t('common.edit')}
						</Button>
					{/if}
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
		{/snippet}
	</DrawerEntityHeader>

	{#if s.description}
		<p class="text-sm text-foreground/70">{s.description}</p>
	{/if}

	{#if isHomework}
		<div class="grid grid-cols-2 gap-3">
			<DrawerField label={$t('drawer.assigned')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
					{s.assignedDate ?? formattedDate}
				</div>
			</DrawerField>
			<DrawerField label={$t('hw.due')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
					{s.dueDate ?? formattedDate}
				</div>
			</DrawerField>
		</div>

		<div>
			<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('drawer.attachments')}
			</p>
			<div class="mt-2 space-y-2">
				{#each s.attachments as attachment (attachment.name)}
					<div class="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
						<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-card">
							<FileText class="h-4 w-4 text-muted-foreground" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm">{attachment.name}</p>
							<p class="font-mono text-[10px] text-muted-foreground">{attachment.size}</p>
						</div>
					</div>
				{/each}
				<Button
					variant="ghost"
					size="sm"
					class="w-full rounded-full border border-dashed border-border"
					onclick={() => (attachOpen = true)}
				>
					<Paperclip class="mr-1 h-3 w-3" />
					{$t('drawer.attachFile')}
				</Button>
			</div>
		</div>
	{:else}
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
	{/if}

	{#if isHomework}
		<div class="space-y-2 border-t border-border pt-4">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('drawer.submissions')} · {s.submittedCount}/{s.total}
			</Label>
			<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
				{#each classStudents as student, index (student.id)}
					{@const submission = submissionsByStudent.get(student.id)}
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
									{new Date(submission.date).toLocaleDateString($locale, { day: 'numeric', month: 'short' })}
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
	{/if}
</div>

<EvaluationCreateModal evaluation={s} classId={s.classId} bind:open={editOpen} />

<FormModal
	bind:open={attachOpen}
	title={$t('hw.attachTitle')}
	description={$t('hw.attachDescription')}
	submitLabel={$t('common.close')}
	onSubmit={() => {
		attachOpen = false;
	}}
>
	<p class="text-sm text-muted-foreground">{$t('hw.attachStub')}</p>
</FormModal>
