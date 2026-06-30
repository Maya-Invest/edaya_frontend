<script lang="ts">
	import type { Student } from '$lib/types/school';
	import type { buildStudentGradeSummary } from './student-tab-selectors.ts';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { FileText } from '$lib/icons';
	import SubjectGroup from '../academics/SubjectGroup.svelte';
	import DrawerEmptyState from '../shared/DrawerEmptyState.svelte';
	import StudentGradeEntryModal from './StudentGradeEntryModal.svelte';

	const {
		s,
		notesData,
	}: {
		s: Student;
		notesData: ReturnType<typeof buildStudentGradeSummary>;
	} = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-xl bg-primary/10 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">Moyenne</p>
			<p class="mt-1 font-display text-2xl">
				{notesData.overall ? notesData.overall.toFixed(1) : '—'}<span class="text-sm text-muted-foreground">
					/ 20</span
				>
			</p>
		</div>
		<div class="rounded-xl bg-secondary/60 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">Évaluations</p>
			<p class="mt-1 font-display text-2xl">{notesData.valid.length}</p>
		</div>
		<div class="rounded-xl bg-secondary p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">À venir</p>
			<p class="mt-1 font-display text-2xl">
				{notesData.studentEvals.length - notesData.valid.length}
			</p>
		</div>
	</div>
	<div>
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			Notes par matière
		</Label>
		<div class="mt-2 space-y-2">
			{#if notesData.studentEvals.length === 0}
				<DrawerEmptyState label="Aucune évaluation.">
					{#snippet icon()}
						<FileText class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each notesData.subjectGroups as { subject, items, subjectAvg } (subject)}
					<SubjectGroup {subject} {items} {subjectAvg} />
				{/each}
			{/if}
		</div>
	</div>
	<PermissionGate
		permission="GRADE_INPUT"
		classId={s.classId}
		mode="disable"
		tooltip="Droit GRADE_INPUT requis."
	>
		{#snippet children({ disabled, title })}
			<StudentGradeEntryModal {s} {disabled} {title} />
		{/snippet}
	</PermissionGate>
</div>
