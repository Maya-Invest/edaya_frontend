<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { StaffMember } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import { t } from '$lib/i18n';
	import { Users } from '$lib/icons';
	import { getStaffAssignmentsTabState } from '../staff-assignments-tab.svelte';

	type StaffAssignment = components['schemas']['StaffAssignment'];

	const { s }: { s: StaffMember } = $props();

	const assignmentsTab = getStaffAssignmentsTabState();
	const rows = $derived(assignmentsTab.assignmentsFor(s.id));
	const classSubjects = $derived(assignmentsTab.classSubjectsFor(s.id));

	function classLabel(classGroupId: string | null | undefined): string {
		if (!classGroupId) {
			return '—';
		}
		return academicContext.classes.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	function subjectLabel(classSubjectId: string | null | undefined): string {
		if (!classSubjectId) {
			return '';
		}
		const classSubject = classSubjects.find(entry => entry.id === classSubjectId);
		if (!classSubject) {
			return classSubjectId;
		}
		const subjectIndex = s.subjectsTaught?.indexOf(classSubject.subjectId) ?? -1;
		if (subjectIndex >= 0 && s.subjectLabels?.[subjectIndex]) {
			return s.subjectLabels[subjectIndex]!;
		}
		return classSubject.subjectId;
	}

	function targetLabel(row: StaffAssignment): string {
		if (row.classSubjectId) {
			const classSubject = classSubjects.find(entry => entry.id === row.classSubjectId);
			const className = classLabel(classSubject?.classGroupId ?? row.classGroupId);
			return `${className} · ${subjectLabel(row.classSubjectId)}`;
		}
		return classLabel(row.classGroupId);
	}
</script>

<div class="space-y-3">
	<div>
		<h4 class="text-sm font-semibold">{$t('staff.assignmentsTitle')}</h4>
		<p class="text-xs text-muted-foreground">{$t('staff.assignmentsReadOnlyHint')}</p>
	</div>

	{#if rows.length === 0}
		<DrawerEmptyState label={$t('staff.noAssignments')}>
			{#snippet icon()}
				<Users class="h-5 w-5 text-muted-foreground" />
			{/snippet}
		</DrawerEmptyState>
	{:else}
		<ul class="divide-y divide-border rounded-xl border border-border bg-card">
			{#each rows as row (row.id)}
				<li class="px-4 py-3">
					<p class="text-sm font-medium">{targetLabel(row)}</p>
					{#if row.responsibility}
						<p class="mt-1 text-xs text-muted-foreground">{row.responsibility}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
