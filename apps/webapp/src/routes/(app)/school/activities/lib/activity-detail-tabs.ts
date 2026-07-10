export const ACTIVITY_DETAIL_TABS = [
	{ key: 'profile', segment: 'profile', labelKey: 'drawer.tab.profile' },
	{ key: 'students', segment: 'students', labelKey: 'activities.tab.students' },
	{ key: 'classes', segment: 'classes', labelKey: 'activities.tab.classes' },
] as const;

export type ActivityDetailTabKey = (typeof ACTIVITY_DETAIL_TABS)[number]['key'];
export type ActivityDetailTabSegment = (typeof ACTIVITY_DETAIL_TABS)[number]['segment'];

export function activeActivityDetailTab(pathname: string, activityId: string): ActivityDetailTabKey {
	const base = `/school/activities/${activityId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/profile`) {
		return 'profile';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = ACTIVITY_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'profile';
}
