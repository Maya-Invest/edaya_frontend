export const STUDENT_DETAIL_TABS = [
	{ key: 'profile', segment: 'profile', labelKey: 'drawer.tab.profile' },
	{ key: 'enrollments', segment: 'enrollments', labelKey: 'drawer.tab.enrollments' },
	{ key: 'attendance', segment: 'attendance', labelKey: 'drawer.tab.attendance' },
	{ key: 'grades', segment: 'grades', labelKey: 'drawer.tab.grades' },
	{ key: 'reportCard', segment: 'report-card', labelKey: 'drawer.tab.reportCard' },
	{ key: 'incidents', segment: 'incidents', labelKey: 'drawer.tab.incidents' },
	{ key: 'finances', segment: 'finances', labelKey: 'drawer.tab.finances' },
	{ key: 'documents', segment: 'documents', labelKey: 'drawer.tab.documents' },
] as const;

export type StudentDetailTabKey = (typeof STUDENT_DETAIL_TABS)[number]['key'];
export type StudentDetailTabSegment = (typeof STUDENT_DETAIL_TABS)[number]['segment'];

export function activeStudentDetailTab(pathname: string, studentId: string): StudentDetailTabKey {
	const base = `/school/students/${studentId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/profile`) {
		return 'profile';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = STUDENT_DETAIL_TABS.find(tab => tab.segment && tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'profile';
}
