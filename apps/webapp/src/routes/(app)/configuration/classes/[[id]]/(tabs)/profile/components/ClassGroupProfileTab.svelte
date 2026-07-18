<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { portalHomeroomTeacherNameForClass } from '$lib/api/teacher-display';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import { t } from '$lib/i18n';
	import { getClassesPageState } from '../../../../classes-page.svelte';

	const { classGroup }: { classGroup: ClassNode } = $props();

	const classesPage = getClassesPageState();

	const live = $derived(
		classesPage.classGroupById(classGroup.id) ?? classGroup,
	);
	const gradeLevel = $derived(academicContext.gradeLevelById(live.gradeLevelId));
	const staffCoordinator = $derived(
		classesPage.staff.find(member => member.id === live.homeroomStaffId)?.name ?? '—',
	);
	const portalHomeroomTeacher = $derived(
		portalHomeroomTeacherNameForClass(live.id, {
			teachersRaw: [],
			teacherAssignmentsRaw: [],
		}),
	);
</script>

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
