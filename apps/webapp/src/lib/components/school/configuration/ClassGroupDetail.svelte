<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { portalHomeroomTeacherNameForClass } from '$lib/api/teacher-display';
	import ClassGroupFormModal from '$lib/components/school/academics/ClassGroupFormModal.svelte';
	import ClassGroupStaffAssignmentsSection from '$lib/components/school/configuration/ClassGroupStaffAssignmentsSection.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';

	const { classGroup }: { classGroup: ClassNode } = $props();

	let tab = $state<'profile' | 'assignments'>('profile');
	let editOpen = $state(false);

	const live = $derived(
		academicContext.classes.find(entry => entry.id === classGroup.id) ?? classGroup,
	);
	const gradeLevel = $derived(academicContext.gradeLevelById(live.gradeLevelId));
	const staffCoordinator = $derived(
		detailDataContext.staff.find(member => member.id === live.homeroomStaffId)?.name ?? '—',
	);
	const portalHomeroomTeacher = $derived(
		portalHomeroomTeacherNameForClass(live.id, {
			teachersRaw: detailDataContext.teachers,
			teacherAssignmentsRaw: detailDataContext.teacherAssignments,
		}),
	);
	const summary = $derived(
		`${$t('classGroups.studentCount')}: ${live.studentCount} · ${gradeLevel?.name ?? live.gradeLevelId}`,
	);
</script>

<div class="space-y-5">
	<DrawerEntityHeader
		name={live.name}
		{summary}
	>
		{#snippet chips()}
			<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
				{$t(`classGroups.attendanceMode.${live.attendanceMode}`)}
			</span>
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE" mode="disable">
				{#snippet children({ disabled, title })}
					<button
						type="button"
						class="inline-flex h-9 items-center rounded-full border border-input bg-background px-4 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
						{disabled}
						{title}
						onclick={() => (editOpen = true)}
					>
						{$t('classGroups.edit')}
					</button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<div class="flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 text-xs">
		{#each ['profile', 'assignments'] as const as key (key)}
			<button
				type="button"
				onclick={() => (tab = key)}
				class={cn(
					'flex-1 rounded-full px-3 py-1.5 font-medium transition',
					tab === key ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
				)}
			>
				{$t(key === 'profile' ? 'classGroups.profileTab' : 'classGroups.assignmentsTab')}
			</button>
		{/each}
	</div>

	{#if tab === 'profile'}
		<div class="space-y-4">
			<DrawerField label={$t('classGroups.name')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.name}</div>
			</DrawerField>
			<div class="grid grid-cols-2 gap-3">
				<DrawerField label={$t('classGroups.gradeLevel')}>
					<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
						{gradeLevel?.name ?? '—'}
					</div>
				</DrawerField>
				<DrawerField label={$t('classGroups.studentCount')}>
					<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.studentCount}</div>
				</DrawerField>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<DrawerField label={$t('classGroups.capacity')}>
					<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
						{live.capacity ?? '—'}
					</div>
				</DrawerField>
				<DrawerField label={$t('classGroups.portalHomeroomTeacher')}>
					<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
						{portalHomeroomTeacher}
					</div>
				</DrawerField>
				<DrawerField label={$t('classGroups.staffCoordinator')}>
					<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{staffCoordinator}</div>
				</DrawerField>
			</div>
			<DrawerField label={$t('classGroups.attendanceMode')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
					{$t(`classGroups.attendanceMode.${live.attendanceMode}`)}
				</div>
			</DrawerField>
		</div>
	{:else}
		<ClassGroupStaffAssignmentsSection classGroup={live} />
	{/if}
</div>

<ClassGroupFormModal bind:open={editOpen} classGroup={live} />
