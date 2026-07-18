export const SUBJECTS_DETAIL_TABS = [
	{ key: 'progression', segment: 'progression', labelKey: 'subjects.tab.chapters' },
	{ key: 'logbook', segment: 'logbook', labelKey: 'subjects.tab.logbook' },
] as const;

export type SubjectsDetailTabKey = (typeof SUBJECTS_DETAIL_TABS)[number]['key'];
export type SubjectsDetailTabSegment = (typeof SUBJECTS_DETAIL_TABS)[number]['segment'];

export function activeSubjectsDetailTab(pathname: string, subjectId: string): SubjectsDetailTabKey {
	const base = `/configuration/subjects/${subjectId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/progression`) {
		return 'progression';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = SUBJECTS_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'progression';
}
