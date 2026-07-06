<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { portalHomeroomTeacherNameForClass } from '$lib/api/teacher-display';
	import ClassGroupFormModal from '$lib/components/school/academics/ClassGroupFormModal.svelte';
	import ClassGroupStaffAssignmentsSection from '$lib/components/school/configuration/ClassGroupStaffAssignmentsSection.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import DrawerTabBar from '$lib/components/ui/DrawerTabBar.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { createUrlSyncedDrawerTabs } from '$lib/drawer/drawer-tabs-state.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';

	const { classGroup }: { classGroup: ClassNode } = $props();

	type ClassGroupTab = 'profile' | 'assignments';

	const tabs = createUrlSyncedDrawerTabs<ClassGroupTab>({
		allowed: ['profile', 'assignments'],
		defaultTab: 'profile',
		getUrl: () => $page.url,
	});

	$effect(() => {
		tabs.hydrate();
	});

	const tabItems = $derived([
		{ key: 'profile', label: $t('classGroups.profileTab') },
		{ key: 'assignments', label: $t('classGroups.assignmentsTab') },
	] as const);

	const modals = createUrlSyncedModals({ allowed: ['edit'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');

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
						onclick={() => (editOpen.open = true)}
					>
						{$t('classGroups.edit')}
					</button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<DrawerTabBar tabs={tabItems} active={tabs.tab} onSelect={key => tabs.select(key as ClassGroupTab)} />

	{#if tabs.tab === 'profile'}
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

<ClassGroupFormModal bind:open={editOpen.open} classGroup={live} />
