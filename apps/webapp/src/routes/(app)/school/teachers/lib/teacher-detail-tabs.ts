import type { PermissionCode } from '$lib/auth/types';

export const TEACHER_DETAIL_TABS = [
	{ key: 'profile', segment: 'profile', labelKey: 'drawer.tab.profile' },
	{ key: 'assignments', segment: 'assignments', labelKey: 'drawer.tab.assignments' },
	{ key: 'availability', segment: 'availability', labelKey: 'drawer.tab.availability' },
	{ key: 'timetable', segment: 'timetable', labelKey: 'drawer.tab.timetable' },
	{ key: 'evaluations', segment: 'evaluations', labelKey: 'drawer.tab.evaluations' },
	{ key: 'family-feedback', segment: 'family-feedback', labelKey: 'drawer.tab.familyFeedback' },
	{ key: 'documents', segment: 'documents', labelKey: 'drawer.tab.documents' },
] as const;

export type TeacherDetailTabKey = (typeof TEACHER_DETAIL_TABS)[number]['key'];
export type TeacherDetailTabSegment = (typeof TEACHER_DETAIL_TABS)[number]['segment'];

export const TEACHER_DETAIL_TAB_PERMISSIONS: Partial<
	Record<TeacherDetailTabKey, readonly PermissionCode[]>
> = {
	'availability': ['STAFF_READ', 'ACCESS_CONTROL_READ'],
	'timetable': ['TIMETABLE_READ'],
	'evaluations': ['GRADE_READ', 'GRADE_MANAGE'],
	'family-feedback': ['FAMILY_FEEDBACK_CAMPAIGN_READ'],
	'documents': ['TIMETABLE_READ'],
};

export function visibleTeacherDetailTabs(
	hasAny: (permissions: readonly PermissionCode[]) => boolean,
): typeof TEACHER_DETAIL_TABS[number][] {
	return TEACHER_DETAIL_TABS.filter((tab) => {
		const required = TEACHER_DETAIL_TAB_PERMISSIONS[tab.key];
		return !required || hasAny(required);
	});
}

export function activeTeacherDetailTab(pathname: string, teacherId: string): TeacherDetailTabKey {
	const base = `/school/teachers/${teacherId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/profile`) {
		return 'profile';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = TEACHER_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'profile';
}
