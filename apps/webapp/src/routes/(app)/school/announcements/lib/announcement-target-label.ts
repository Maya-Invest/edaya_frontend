import type { AnnouncementTarget, AnnouncementTargetKind, ClassNode, GradeLevel, Guardian, StaffMember, Student } from '$lib/types/school';

const BROADCAST_TARGET_KINDS = new Set<AnnouncementTargetKind>([
	'school',
	'all_staff',
	'all_guardians',
	'all_students',
]);

export function announcementTargetNeedsEntity(targetKind: AnnouncementTargetKind): boolean {
	return !BROADCAST_TARGET_KINDS.has(targetKind);
}

export function resolveAnnouncementTargetLabel(
	target: AnnouncementTarget,
	context: {
		academic: { classes: ClassNode[]; gradeLevels: GradeLevel[] };
		detail: { students: Student[]; guardians: Guardian[]; staff: StaffMember[] };
		labelForKind: (kind: AnnouncementTargetKind) => string;
	},
): string {
	const base = context.labelForKind(target.targetKind);
	if (!target.targetId) {
		return base;
	}

	switch (target.targetKind) {
		case 'class_group':
			return `${base} — ${context.academic.classes.find(entry => entry.id === target.targetId)?.name ?? target.targetId}`;
		case 'grade_level':
			return `${base} — ${context.academic.gradeLevels.find(entry => entry.id === target.targetId)?.name ?? target.targetId}`;
		case 'staff_member':
			return `${base} — ${context.detail.staff.find(entry => entry.id === target.targetId)?.name ?? target.targetId}`;
		case 'guardian':
			return `${base} — ${context.detail.guardians.find(entry => entry.id === target.targetId)?.name ?? target.targetId}`;
		case 'student':
			return `${base} — ${context.detail.students.find(entry => entry.id === target.targetId)?.name ?? target.targetId}`;
		default:
			return base;
	}
}
