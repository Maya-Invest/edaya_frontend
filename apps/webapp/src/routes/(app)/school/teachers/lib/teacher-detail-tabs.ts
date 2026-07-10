export const TEACHER_DETAIL_TABS = [
	{ key: 'profile', segment: 'profile', labelKey: 'drawer.tab.profile' },
	{ key: 'assignments', segment: 'assignments', labelKey: 'drawer.tab.assignments' },
] as const;

export type TeacherDetailTabKey = (typeof TEACHER_DETAIL_TABS)[number]['key'];
export type TeacherDetailTabSegment = (typeof TEACHER_DETAIL_TABS)[number]['segment'];

export function activeTeacherDetailTab(pathname: string, teacherId: string): TeacherDetailTabKey {
	const base = `/school/teachers/${teacherId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/profile`) {
		return 'profile';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = TEACHER_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'profile';
}
