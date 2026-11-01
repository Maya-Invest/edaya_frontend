export const TEACHING_DETAIL_TABS = [
	{ key: 'students', segment: 'students', labelKey: 'participation.students' },
	{ key: 'progression', segment: 'progression', labelKey: 'subjects.tab.chapters' },
	{ key: 'logbook', segment: 'logbook', labelKey: 'subjects.tab.logbook' },
] as const;

export type TeachingDetailTabKey = (typeof TEACHING_DETAIL_TABS)[number]['key'];
export type TeachingDetailTabSegment = (typeof TEACHING_DETAIL_TABS)[number]['segment'];

export function activeTeachingDetailTab(pathname: string, classId: string, subjectId: string): TeachingDetailTabKey {
	const base = `/classes/${classId}/teaching/${subjectId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/progression`) {
		return 'progression';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = TEACHING_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'progression';
}
