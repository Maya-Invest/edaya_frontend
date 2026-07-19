export const SESSION_DETAIL_TABS = [
	{ key: 'details', segment: 'details', labelKey: 'planning.session.detailsTab' },
	{ key: 'attendance', segment: 'attendance', labelKey: 'planning.session.attendanceTab' },
	{ key: 'logbook', segment: 'logbook', labelKey: 'subjects.tab.logbook' },
] as const;

export type SessionDetailTabKey = (typeof SESSION_DETAIL_TABS)[number]['key'];
export type SessionDetailTabSegment = (typeof SESSION_DETAIL_TABS)[number]['segment'];

export function activeSessionDetailTab(pathname: string, classId: string, sessionId: string): SessionDetailTabKey {
	const base = `/classes/${classId}/timetable/${sessionId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/details`) {
		return 'details';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = SESSION_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'details';
}

export function sessionDetailTabsForKind(kind: string): readonly SessionDetailTabKey[] {
	return kind === 'lesson' || kind === 'activity'
		? ['details', 'attendance', 'logbook']
		: ['details', 'attendance'];
}
