<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Users } from '$lib/icons';
	import DrawerEmptyState from '../shared/DrawerEmptyState.svelte';

	const { staff }: { staff: StaffMember } = $props();

	const rows = $derived(detailDataContext.staffAssignmentsForStaff(staff.id));

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
		return detailDataContext.subjects.find(subject => subject.id === classSubjectId)?.name ?? classSubjectId;
	}

	function targetLabel(row: (typeof rows)[number]): string {
		if (row.classSubjectId) {
			const subject = detailDataContext.subjects.find(entry => entry.id === row.classSubjectId);
			const className = classLabel(subject?.classId);
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
		<ul class="space-y-2">
			{#each rows as row (row.id)}
				<li class="rounded-xl border border-border bg-secondary/20 px-3 py-2.5">
					<p class="text-sm font-medium">{targetLabel(row)}</p>
					<p class="mt-0.5 text-xs text-muted-foreground">
						{formatPermissionLabel(row.responsibility)}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</div>
